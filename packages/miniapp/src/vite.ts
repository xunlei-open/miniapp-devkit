import { resolve } from 'node:path'
import miniappPlugin from '@xunlei-open/vite-plugin-miniapp'
import {
  build as viteBuild,
  createServer,
  mergeConfig,
  type ConfigEnv,
  type InlineConfig,
  type ViteDevServer,
} from 'vite'
import { loadMiniappConfig } from './config.js'
import { localDevEntry } from './dev-entry.js'
import { devEvents } from './dev-events.js'
import type { BuildMiniappOptions, DevMiniappOptions, ResolvedMiniappConfig } from './types.js'
import { validateMiniappDirectory, validateSourceManifest } from './validate.js'

function configEnv(command: ConfigEnv['command'], mode: string): ConfigEnv {
  return { command, mode, isSsrBuild: false, isPreview: false }
}

function createInlineConfig(config: ResolvedMiniappConfig): InlineConfig {
  return mergeConfig(config.vite, {
    root: config.root,
    configFile: false,
    plugins: [
      miniappPlugin({
        eventsDir: config.eventsDir,
        eventsExtensions: config.eventsExtensions,
        manifestFile: config.manifestFile,
      }),
    ],
  })
}

export function resolveOutputDirectory(config: ResolvedMiniappConfig): string {
  return resolve(config.root, config.vite.build?.outDir ?? 'output')
}

export async function buildMiniapp(
  options: BuildMiniappOptions = {},
): Promise<{ config: ResolvedMiniappConfig; outDir: string }> {
  const root = options.root ?? process.cwd()
  const mode = options.mode ?? 'production'
  const config = await loadMiniappConfig(root, configEnv('build', mode))

  await viteBuild(createInlineConfig(config))

  const outDir = resolveOutputDirectory(config)
  await validateMiniappDirectory(outDir)
  return { config, outDir }
}

export async function validateBuiltMiniapp(options: BuildMiniappOptions = {}) {
  const root = options.root ?? process.cwd()
  const mode = options.mode ?? 'production'
  const config = await loadMiniappConfig(root, configEnv('build', mode))
  return validateMiniappDirectory(resolveOutputDirectory(config))
}

export async function devMiniapp(options: DevMiniappOptions = {}): Promise<ViteDevServer> {
  const root = options.root ?? process.cwd()
  const mode = options.mode ?? 'development'
  const config = await loadMiniappConfig(root, configEnv('serve', mode))
  const manifest = await validateSourceManifest(resolve(config.root, config.manifestFile))

  const inlineConfig = createInlineConfig(config)
  const outDir = resolve(config.root, config.devOutDir)
  // Vite should ignore the on-disk development output as well as production output.
  inlineConfig.server = {
    ...inlineConfig.server,
    watch: {
      ...inlineConfig.server?.watch,
      ignored: [
        ...(Array.isArray(inlineConfig.server?.watch?.ignored)
          ? inlineConfig.server.watch.ignored
          : inlineConfig.server?.watch?.ignored
            ? [inlineConfig.server.watch.ignored]
            : []),
        `${outDir.replaceAll('\\', '/')}/**`,
      ],
    },
  }
  const devEntry = localDevEntry(config.root, outDir, config.manifestFile, manifest)
  const events = devEvents(config, outDir, manifest, mode)
  inlineConfig.plugins = [...(inlineConfig.plugins ?? []), devEntry.plugin, events.plugin]
  inlineConfig.server = {
    ...inlineConfig.server,
    // Local file pages have an opaque ("null") origin. Explicit user CORS wins.
    cors: inlineConfig.server?.cors ?? {
      origin: [/^https?:\/\/(?:(?:[^:]+\.)?localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/, 'null'],
    },
    ...(options.host ? { host: options.host } : {}),
    ...(options.port ? { port: options.port } : {}),
  }
  if (!manifest.entry) {
    // Keep Vite's file watcher for sandbox builds without opening an HTTP/HMR server.
    inlineConfig.server.middlewareMode = true
    inlineConfig.server.hmr = false
    inlineConfig.server.open = false
  }

  const server = await createServer(inlineConfig)
  try {
    if (manifest.entry) await server.listen()
    await devEntry.write(server)
    await events.start(server)
  } catch (error) {
    await server.close()
    throw error
  }
  if (manifest.entry) {
    server.printUrls()
    server.bindCLIShortcuts({ print: true })
  }
  console.log(`\nLoad this directory in Xunlei: ${outDir}\n`)
  return server
}
