# 运行环境与构建选择

## 页面与资源地址

- 包内 UI 页面加载为 `miniapp://<identity>/index.html`。每个应用拥有独立 host，路径 `/` 对应该应用的安装或开发目录根。
- `/assets/main.js` 指向当前应用的资源，Vite 默认 `base: '/'` 适用。另有子路径部署或独立文件预览需求时再调整。
- 包内页面可使用标准 URL 解析和 `fetch` 读取资源；远程数据请求仍需声明相应权限和 URL 范围。
- manifest 的 `entry.url`、`icon` 和脚本入口仍按清单规范填写包内相对路径。它们与 Vite 的资源 `base` 不是同一项配置。

## 开发与生产的加载差异

| 项目          | 开发模式                                                                            | 生产模式                       |
| ------------- | ----------------------------------------------------------------------------------- | ------------------------------ |
| 页面入口      | 宿主加载 `dist` 内的开发入口，页面仍是 `miniapp://<identity>/...`                   | 宿主加载包内构建入口           |
| JS/CSS 等资源 | devkit 将开发入口的资源地址改写到 Vite 服务；设置开发资源 origin                    | 从微应用站点根目录读取包内资源 |
| 本机开发请求  | 允许 localhost、127.0.0.1 的 HTTP(S)/WS(S) 资源请求；不包含主页面、iframe 和 object | 没有此开发例外                 |
| Vite CORS     | devkit 已默认允许 localhost、本机回环地址及 `"null"` 来源                           | 开发服务器配置不参与安装包运行 |

默认本机开发无需另设 `server.cors` 或增加 `network.urls`。使用其他开发来源时，需同时满足客户端资源规则和开发服务器的跨域配置。

主页面支持跨域数据请求，但仍受权限和资源加载规则约束，不能因此直接加载任意远程脚本。辅助页面按目标网站的浏览器环境运行。

## Node.js 库与垫片

微应用可以通过构建时 Node 垫片使用兼容的 Node.js/npm 库，不必只寻找标注为浏览器版的库。先检查应用的 `package.json`、构建配置及依赖的实际调用路径，沿用已有垫片；缺失时可按需接入 `vite-plugin-node-polyfills`。垫片不是 devkit 默认注入的完整 Node.js 运行时。

```ts
// miniapp.config.ts：保留工程已有 modules 和其他 Vite 配置。
import { defineConfig } from '@xunlei-open/miniapp'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  vite: {
    plugins: [nodePolyfills({ protocolImports: true })],
  },
})
```

将插件声明在使用它的应用工作区；已有普通 Vite 配置或独立依赖 bundle 时，将插件放在实际负责该依赖的构建中。`protocolImports` 用于适配 `node:` 前缀，`Buffer`、`process` 等全局和核心模块的支持范围以所用插件版本为准。

- 垫片可提供部分 Buffer、流、加密、路径等能力，但不能凭空提供本机文件系统、子进程、原生扩展或监听端口。只针对实际使用的功能验证兼容性；不要用静默空实现掩盖必需能力。
- 网络库应选择适用的浏览器 adapter，必要时适配到 `fetch`；Node HTTP/HTTPS、代理、Cookie 和浏览器请求的行为并不等价，网络权限与目标页面跨域规则仍然适用。检查依赖是否加载了另一份 HTTP 客户端，避免 adapter 只替换到未被使用的实例。
- Node 垫片不会赋予主页面目标站点的登录态。需要已有网页登录会话时，可以在辅助 WebView 内运行打包好的依赖；登录凭据和传输方式按该功能的会话边界设计。
- 先验证类型检查和生产构建，再在目标宿主验证真实调用、分页、超时与取消。构建成功或浏览器替身测试通过不代表所有 Node API 均可用。

辅助 WebView 的 `execute()` 不继承主页面的 npm 依赖或 Node 垫片。依赖需连同垫片打包为自包含脚本；独立 bundle 可用 Vite 的 IIFE 库模式。`execute()` 接受函数或表达式，执行完整 bundle 时用 IIFE 包成表达式，例如 `(()=>{ /* 打包代码 */; return true })()`，并确认初始化结果。不要直接传入带顶层声明的整段程序或未经打包的 `?raw` 源码。

## Worker 与 WASM

```ts
// src/main.ts：入口使用静态字符串，让 Vite 分析并处理依赖。
const worker = new Worker(new URL('./compute.worker.ts', import.meta.url), {
  type: 'module',
})
```

```ts
// miniapp.config.ts：使用 ES 模块 Worker 时的配置示例。
import { defineConfig } from '@xunlei-open/miniapp'

export default defineConfig({
  vite: { worker: { format: 'es' } },
})
```

Vue/React 应用保留已有 `modules`。开发模式支持从本机 Vite 服务加载原生模块 Worker，生产输出也由 Vite 处理，通常无需单独的 watch 构建或开发/生产地址分支。

WASM 使用依赖的加载接口，或通过 `?url` 导入包内资源地址。包内响应的 MIME 不一定是 `application/wasm`，这种情况下使用 `fetch` 读取 ArrayBuffer 后初始化，而非 `instantiateStreaming`。Worker 不自动获得页面的 `xunlei`，宿主调用由页面完成并通过消息传递结果。

客户端 Web API 的可用性与构建 target 是两回事；如使用 `AbortSignal.any` 等较新 API，按目标客户端能力提供兼容处理。

## 主页面与辅助 WebView

| 项目          | 微应用主页面                       | `runtime.webview` 辅助页面   |
| ------------- | ---------------------------------- | ---------------------------- |
| 地址          | 当前应用的 `miniapp://` 站点       | `goto()` 指定的目标站点      |
| 宿主 API      | 注入 `xunlei`                      | 不注入 `xunlei`              |
| 跨域请求      | 支持，仍受应用权限和 URL 规则约束  | 遵循目标页面的浏览器跨域规则 |
| Cookie 与存储 | 按应用隔离，开发与正式运行环境分开 | 与主页面隔离                 |

普通计算和允许的数据接口使用主页面或 Worker；需要目标站点页面状态、登录或执行网页脚本时使用辅助页面。批量操作可复用辅助页面，结束后关闭。

`execute()` 不会加载主页面的 npm 依赖。简单逻辑直接传函数及参数；带依赖的逻辑可打包成自包含脚本再执行。`?raw` 只读取源码，不能替代依赖打包。辅助页面接口用法见 [平台 API](platform.md#辅助-webview)。
