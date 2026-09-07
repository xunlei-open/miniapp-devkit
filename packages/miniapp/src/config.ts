import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadConfigFromFile, type ConfigEnv, type UserConfig } from 'vite'
import type {
  MiniappUserConfig,
  ResolvedMiniappConfig,
} from './types.js'

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

function findConfigFile(root: string): string {
  const matches = CONFIG_FILES.map((file) => resolve(root, file)).filter(existsSync)

  if (matches.length === 0) {
    throw new Error(`No miniapp.config file found in ${root}`)
  }
  if (matches.length > 1) {
    throw new Error(
      `Multiple miniapp config files found: ${matches.map((file) => file.split('/').at(-1)).join(', ')}`,
    )
  }

  return matches[0]!
}

function assertUserConfig(value: unknown, configFile: string): MiniappUserConfig {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${configFile} must export a configuration object`)
  }
  return value as MiniappUserConfig
}

async function resolveViteConfig(
  vite: MiniappUserConfig['vite'],
  env: ConfigEnv,
): Promise<UserConfig> {
  if (!vite) return {}
  const config = typeof vite === 'function' ? await vite(env) : vite
  if (typeof config !== 'object' || config === null || Array.isArray(config)) {
    throw new Error('miniapp.config vite must resolve to a Vite configuration object')
  }
  return config
}

export async function loadMiniappConfig(
  rootDirectory: string,
  env: ConfigEnv,
): Promise<ResolvedMiniappConfig> {
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

  return {
    root,
    configFile,
    manifestFile: config.manifest ?? 'manifest.json',
    eventsDir: config.events?.dir ?? 'src/events',
    eventsExtensions,
    packageOutDir: config.package?.outDir ?? 'release',
    packageFileName: config.package?.fileName,
    vite: await resolveViteConfig(config.vite, env),
  }
}
