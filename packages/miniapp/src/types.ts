import type { MiniappManifest } from '@xunlei-open/miniapp-types'
import type { ConfigEnv, UserConfig } from 'vite'

export type MaybePromise<T> = T | Promise<T>

export interface MiniappEventsConfig {
  /** @default 'src/events' */
  dir?: string
  /** @default ['.ts', '.js'] */
  extensions?: string[]
}

export interface MiniappPackageConfig {
  /** Directory used when no explicit output file is provided. @default 'release' */
  outDir?: string
  /** Defaults to `<manifest.name>-<manifest.version>.zip`. */
  fileName?: string
}

export type MiniappViteConfig =
  | UserConfig
  | ((env: ConfigEnv) => MaybePromise<UserConfig>)

export interface MiniappUserConfig {
  /** @default 'manifest.json' */
  manifest?: string
  events?: MiniappEventsConfig
  package?: MiniappPackageConfig
  vite?: MiniappViteConfig
}

export interface ResolvedMiniappConfig {
  root: string
  configFile: string
  manifestFile: string
  eventsDir: string
  eventsExtensions: string[]
  packageOutDir: string
  packageFileName?: string
  vite: UserConfig
}

export interface MiniappValidationResult {
  directory: string
  manifestPath: string
  manifest: MiniappManifest
  files: string[]
}

export interface BuildMiniappOptions {
  root?: string
  mode?: string
}

export interface DevMiniappOptions extends BuildMiniappOptions {
  host?: string
  port?: number
}

export interface PackageMiniappOptions extends BuildMiniappOptions {
  build?: boolean
  outFile?: string
}
