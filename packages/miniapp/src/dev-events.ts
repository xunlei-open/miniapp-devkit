import { mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import type { MiniappManifest } from '@xunlei-open/miniapp-types'
import miniappPlugin from '@xunlei-open/vite-plugin-miniapp'
import { build, normalizePath, type Plugin, type ViteDevServer } from 'vite'
import { loadMiniappConfig } from './config.js'
import type { ResolvedMiniappConfig } from './types.js'

/** Build sandbox scripts on disk independently from the page's Vite HMR graph. */
export function devEvents(config: ResolvedMiniappConfig, outDir: string, manifest: MiniappManifest, mode: string) {
  const eventsDir = resolve(config.root, config.eventsDir)
  let server: ViteDevServer
  let dependencies = new Set<string>()
  let outputs = new Set<string>()
  let pending = Promise.resolve()
  let stopped = false
  let failed = false

  async function rebuild() {
    const sources = await readdir(eventsDir, { withFileTypes: true }).catch(error => {
      if (error.code === 'ENOENT') return []
      throw error
    })
    const hasEntries = sources.some(source => source.isFile()
      && !source.name.endsWith('.d.ts')
      && config.eventsExtensions.some(ext => source.name.endsWith(ext)))
    const nextDependencies = new Set<string>()
    const files = new Map<string, string | Uint8Array>()
    if (hasEntries) {
      // Vite plugins can hold server state. Never reuse the live page's instances.
      const eventConfig = await loadMiniappConfig(config.root, {
        command: 'build', mode, isSsrBuild: false, isPreview: false,
      })
      const options = eventConfig.vite.build
      const result = await build({
        ...eventConfig.vite,
        root: config.root,
        configFile: false,
        mode,
        publicDir: false,
        logLevel: 'warn',
        plugins: [
          ...(eventConfig.vite.plugins ?? []),
          miniappPlugin({
            eventsOnly: true,
            eventsDir: config.eventsDir,
            eventsExtensions: config.eventsExtensions,
          }),
          {
            name: 'miniapp-dev-events-output',
            generateBundle() {
              for (const file of this.getModuleIds()) {
                const path = file.split('?')[0]!
                if (isAbsolute(path)) nextDependencies.add(resolve(path))
              }
            },
          },
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
          files.set(file.fileName, file.type === 'chunk' ? file.code : file.source)
        }
      }
    }

    dependencies = nextDependencies
    server.watcher.add([...dependencies])
    // Publish only event outputs, and only after a successful compilation.
    for (const name of files.keys()) {
      const path = normalizePath(relative(outDir, resolve(outDir, name)))
      if (!path.startsWith('events/') || path.includes('../')) {
        throw new Error(`Event build emitted a file outside events/: ${name}`)
      }
    }
    for (const [name, content] of files) {
      const path = resolve(outDir, name)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, content)
    }
    for (const name of outputs) {
      if (!files.has(name)) await rm(resolve(outDir, name), { force: true })
    }
    outputs = new Set(files.keys())
    for (const script of manifest.scripts ?? []) {
      const entry = normalizePath(relative(outDir, resolve(outDir, script.entry)))
      if (!outputs.has(entry)) {
        throw new Error(`manifest script "${script.entry}" has no built event entry. Add its source to ${config.eventsDir}.`)
      }
    }
    if (hasEntries) server.config.logger.info('[miniapp] Event scripts built. Reload the application in the host if it caches scripts.')
  }

  function onChange(event: string, file: string) {
    if (stopped || !['add', 'change', 'unlink'].includes(event)) return
    const path = resolve(file)
    const entry = dirname(path) === eventsDir && config.eventsExtensions.some(ext => path.endsWith(ext))
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
        server.config.logger.error(`[miniapp] Event build failed: ${error instanceof Error ? error.message : String(error)}`)
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
