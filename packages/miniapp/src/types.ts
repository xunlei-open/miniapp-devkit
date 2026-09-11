import type { MiniappManifest } from '@xunlei-open/miniapp-types'
import type { ConfigEnv, UserConfig } from 'vite'

/** 可直接返回的值或异步返回该值的承诺对象。 */
export type MaybePromise<T> = T | Promise<T>

export interface MiniappEventsConfig {
  /** 事件脚本目录，默认相对于项目根目录。默认值：`src/events`。 */
  dir?: string
  /** 识别的事件脚本扩展名，需包含前导点。默认值：`['.ts', '.js']`。 */
  extensions?: string[]
}

export interface MiniappPackageConfig {
  /** 未显式指定输出文件时使用的打包目录。默认值：`release`。 */
  outDir?: string
  /** 压缩包文件名，不得包含目录，须以 `.zip` 结尾。默认由清单中的名称和版本经文件名清理后拼接为 `<名称>-<版本>.zip`。 */
  fileName?: string
}

/** 构建工具配置，支持配置对象或根据运行环境同步、异步生成配置的函数。 */
export type MiniappViteConfig =
  | UserConfig
  | ((env: ConfigEnv) => MaybePromise<UserConfig>)

export interface MiniappUserConfig {
  /** 框架模块列表，按声明顺序从项目依赖中解析并加载，重复模块仅加载一次。 */
  modules?: string[]
  /** 微应用清单路径，默认相对于项目根目录。默认值：`manifest.json`。 */
  manifest?: string
  /** 事件脚本配置。 */
  events?: MiniappEventsConfig
  /** 压缩包输出配置。 */
  package?: MiniappPackageConfig
  /** 项目构建配置，在框架模块提供的默认配置之后合并。 */
  vite?: MiniappViteConfig
}

export interface MiniappModule {
  /** 模块名称。 */
  name: string
  /** 模块提供的默认构建配置，项目配置会在此基础上合并。 */
  vite: MiniappViteConfig
}

/** 加载并合并默认值、框架模块和项目配置后的结果。 */
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

/** 微应用目录校验结果，包含清单和文件列表。 */
export interface MiniappValidationResult {
  directory: string
  manifestPath: string
  manifest: MiniappManifest
  files: string[]
}

export interface BuildMiniappOptions {
  /** 项目根目录，默认为当前工作目录。 */
  root?: string
  /** 运行模式。 */
  mode?: string
}

export interface DevMiniappOptions extends BuildMiniappOptions {
  /** 开发服务器监听地址。 */
  host?: string
  /** 开发服务器监听端口。 */
  port?: number
}

export interface PackageMiniappOptions extends BuildMiniappOptions {
  /** 打包前是否执行构建，默认为 true。 */
  build?: boolean
  /** 输出压缩包路径，相对路径以项目根目录为基准；指定后优先于打包目录和文件名配置。 */
  outFile?: string
}
