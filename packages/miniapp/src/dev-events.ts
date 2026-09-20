import { readdir } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import type { MiniappManifest } from '@xunlei-open/miniapp-types'
import miniappPlugin from '@xunlei-open/vite-plugin-miniapp'
import { build, type Plugin, type ViteDevServer } from 'vite'
import { eventOutput } from './event-output.js'
import { loadMiniappConfig } from './config.js'
import type { ResolvedMiniappConfig } from './types.js'

/** Build sandbox scripts on disk independently from the page's Vite HMR graph. */
export function devEvents(config: ResolvedMiniappConfig, outDir: string, manifest: MiniappManifest, mode: string) {
  const eventsDir = resolve(config.root, config.eventsDir)
  let server: ViteDevServer
  let dependencies = new Set<string>()
  const publish = eventOutput(outDir, [
    'manifest.json',
    'index.html',
    ...(manifest.entry ? [manifest.entry.url] : []),
    ...(manifest.icon ? [manifest.icon] : []),
  ])
  let pending = Promise.resolve()
  let stopped = false
  let failed = false

  async function rebuild() {
    const sources = await readdir(eventsDir, { withFileTypes: true }).catch((error) => {
      if (error.code === 'ENOENT') return []
      throw error
    })
    const hasEntries = sources.some(
      (source) =>
        source.isFile() &&
        !source.name.endsWith('.d.ts') &&
        config.eventsExtensions.some((ext) => source.name.endsWith(ext)),
    )
    const nextDependencies = new Set<string>()
    const files = new Map<string, string | Uint8Array>()
    const entries = new Set<string>()
    const trackDependencies = (): Plugin => ({
      name: 'miniapp-dev-events-dependencies',
      generateBundle() {
        for (const file of this.getModuleIds()) {
          const path = file.split('?')[0]!
          if (isAbsolute(path)) nextDependencies.add(resolve(path))
        }
      },
    })
    if (hasEntries) {
      // Vite plugins can hold server state. Never reuse the live page's instances.
      const eventConfig = await loadMiniappConfig(config.root, {
        command: 'build',
        mode,
        isSsrBuild: false,
        isPreview: false,
      })
      const options = eventConfig.vite.build
      const result = await build({
        ...eventConfig.vite,
        root: config.root,
        configFile: false,
        mode,
        publicDir: false,
        logLevel: 'warn',
        worker: {
          ...eventConfig.vite.worker,
          plugins: () => [...(eventConfig.vite.worker?.plugins?.() ?? []), trackDependencies()],
        },
        plugins: [
          ...(eventConfig.vite.plugins ?? []),
          miniappPlugin({
            eventsOnly: true,
            eventsDir: config.eventsDir,
            eventsExtensions: config.eventsExtensions,
          }),
          trackDependencies(),
        ],
        build: {
          ...options,
          outDir,
          emptyOutDir: false,
          copyPublicDir: false,
          write: false,
          watch: null,
          lib: false,
          ssr: false,
          sourcemap: false,
          minify: false,
          manifest: false,
          ssrManifest: false,
          // Only sandbox entries; never rebuild/overwrite the local HMR HTML.
          rolldownOptions: undefined,
          rollupOptions: {
            ...options?.rollupOptions,
            ...options?.rolldownOptions,
            input: undefined,
            output: undefined,
          },
        },
      })
      for (const bundle of Array.isArray(result) ? result : [result]) {
        if (!('output' in bundle)) throw new Error('Unexpected event build watcher')
        for (const file of bundle.output) {
          if (files.has(file.fileName)) throw new Error(`Event build emitted duplicate output: ${file.fileName}`)
          files.set(file.fileName, file.type === 'chunk' ? file.code : file.source)
          if (file.type === 'chunk' && file.isEntry) entries.add(file.fileName)
        }
      }
    }

    dependencies = nextDependencies
    server.watcher.add([...dependencies])
    await publish(
      files,
      entries,
      (manifest.scripts ?? []).map((script) => script.entry),
    )
    if (hasEntries)
      server.config.logger.info(
        '[miniapp] Event scripts built. Reload the application in the host if it caches scripts.',
      )
  }

  function onChange(event: string, file: string) {
    if (stopped || !['add', 'change', 'unlink'].includes(event)) return
    const path = resolve(file)
    const entry = dirname(path) === eventsDir && config.eventsExtensions.some((ext) => path.endsWith(ext))
    const relativeToOutput = relative(outDir, path)
    if (relativeToOutput !== '..' && !relativeToOutput.startsWith(`..${sep}`) && !isAbsolute(relativeToOutput)) return
    if (!entry && !dependencies.has(path) && !failed) return
    pending = pending.then(async () => {
      if (stopped) return
      try {
        await rebuild()
        failed = false
      } catch (error) {
        failed = true
        server.config.logger.error(
          `[miniapp] Event build failed: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    })
  }

  const plugin: Plugin = {
    name: 'miniapp-dev-events',
    apply: 'serve',
    async closeBundle() {
      stopped = true
      server?.watcher.off('all', onChange)
      await pending
    },
  }

  return {
    plugin,
    async start(devServer: ViteDevServer) {
      server = devServer
      await rebuild()
      server.watcher.add(eventsDir)
      server.watcher.on('all', onChange)
    },
  }
}
