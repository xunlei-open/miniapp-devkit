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
import type {
  BuildMiniappOptions,
  DevMiniappOptions,
  ResolvedMiniappConfig,
} from './types.js'
import {
  validateMiniappDirectory,
  validateSourceManifest,
} from './validate.js'

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
  return resolve(config.root, config.vite.build?.outDir ?? 'dist')
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

export async function validateBuiltMiniapp(
  options: BuildMiniappOptions = {},
) {
  const root = options.root ?? process.cwd()
  const mode = options.mode ?? 'production'
  const config = await loadMiniappConfig(root, configEnv('build', mode))
  return validateMiniappDirectory(resolveOutputDirectory(config))
}

export async function devMiniapp(
  options: DevMiniappOptions = {},
): Promise<ViteDevServer> {
  const root = options.root ?? process.cwd()
  const mode = options.mode ?? 'development'
  const config = await loadMiniappConfig(root, configEnv('serve', mode))
  await validateSourceManifest(resolve(config.root, config.manifestFile))

  const inlineConfig = createInlineConfig(config)
  inlineConfig.server = {
    ...inlineConfig.server,
    ...(options.host ? { host: options.host } : {}),
    ...(options.port ? { port: options.port } : {}),
  }

  const server = await createServer(inlineConfig)
  await server.listen()
  server.printUrls()
  server.bindCLIShortcuts({ print: true })
  console.log(`\nLoad this directory in Xunlei: ${config.root}\n`)
  return server
}
