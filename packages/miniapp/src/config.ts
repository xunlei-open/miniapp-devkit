import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { loadConfigFromFile, mergeConfig, type ConfigEnv, type UserConfig } from 'vite'
import type { MiniappModule, MiniappUserConfig, ResolvedMiniappConfig } from './types.js'

const CONFIG_FILES = [
  'miniapp.config.ts',
  'miniapp.config.mts',
  'miniapp.config.js',
  'miniapp.config.mjs',
  'miniapp.config.cts',
  'miniapp.config.cjs',
] as const

const DEFAULT_EVENT_EXTENSIONS = ['.ts', '.js']

export function defineConfig(config: MiniappUserConfig): MiniappUserConfig {
  return config
}

export function defineMiniappModule(module: MiniappModule): MiniappModule {
  return module
}

async function loadModules(names: string[], configFile: string, env: ConfigEnv): Promise<UserConfig> {
  if (!Array.isArray(names) || names.some((name) => typeof name !== 'string' || !name.trim())) {
    throw new Error('miniapp.config modules must be an array of module names')
  }
  const require = createRequire(configFile)
  let config: UserConfig = {}
  for (const name of new Set(names)) {
    try {
      const { default: module } = await import(pathToFileURL(require.resolve(name)).href)
      if (!module || typeof module !== 'object' || typeof module.name !== 'string' || !module.vite) {
        throw new Error('must export a MiniappModule with name and vite fields')
      }
      config = mergeConfig(config, await resolveViteConfig(module.vite, env))
    } catch (error) {
      throw new Error(
        `Failed to load miniapp module "${name}" from ${configFile}: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      )
    }
  }
  return config
}

function findConfigFile(root: string): string {
  const matches = CONFIG_FILES.map((file) => resolve(root, file)).filter(existsSync)

  if (matches.length === 0) {
    throw new Error(`No miniapp.config file found in ${root}`)
  }
  if (matches.length > 1) {
    throw new Error(`Multiple miniapp config files found: ${matches.map((file) => file.split('/').at(-1)).join(', ')}`)
  }

  return matches[0]!
}

function assertUserConfig(value: unknown, configFile: string): MiniappUserConfig {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${configFile} must export a configuration object`)
  }
  return value as MiniappUserConfig
}

async function resolveViteConfig(vite: MiniappUserConfig['vite'], env: ConfigEnv): Promise<UserConfig> {
  if (!vite) return {}
  const config = typeof vite === 'function' ? await vite(env) : vite
  if (typeof config !== 'object' || config === null || Array.isArray(config)) {
    throw new Error('miniapp.config vite must resolve to a Vite configuration object')
  }
  return config
}

export async function loadMiniappConfig(rootDirectory: string, env: ConfigEnv): Promise<ResolvedMiniappConfig> {
  const root = resolve(rootDirectory)
  const configFile = findConfigFile(root)
  const loaded = await loadConfigFromFile(env, configFile, root)

  if (!loaded) {
    throw new Error(`Failed to load ${configFile}`)
  }

  const config = assertUserConfig(loaded.config, configFile)
  const eventsExtensions = config.events?.extensions ?? DEFAULT_EVENT_EXTENSIONS

  if (eventsExtensions.length === 0) {
    throw new Error('events.extensions must contain at least one file extension')
  }

  const vite = mergeConfig(
    { build: { outDir: 'output' } },
    mergeConfig(await loadModules(config.modules ?? [], configFile, env), await resolveViteConfig(config.vite, env)),
  )
  const devOutDir = config.dev?.outDir ?? 'dist'
  const devPath = resolve(root, devOutDir)
  const buildPath = resolve(root, vite.build?.outDir ?? 'output')
  const contains = (parent: string, child: string) => {
    const path = relative(parent, child)
    return path === '' || (path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path))
  }
  if (contains(devPath, buildPath) || contains(buildPath, devPath)) {
    throw new Error('dev.outDir and vite.build.outDir must be separate directories, neither containing the other')
  }

  return {
    root,
    configFile,
    manifestFile: config.manifest ?? 'manifest.json',
    eventsDir: config.events?.dir ?? 'src/events',
    eventsExtensions,
    devOutDir,
    packageOutDir: config.package?.outDir ?? 'output',
    packageFileName: config.package?.fileName,
    vite,
  }
}
