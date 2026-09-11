# 迅雷微应用开发工具

[![CI](https://github.com/xunlei-open/miniapp-devkit/actions/workflows/ci.yml/badge.svg)](https://github.com/xunlei-open/miniapp-devkit/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

`miniapp-devkit` 是迅雷微应用的开源开发工具仓库，提供统一开发命令、TypeScript 类型、Vite 构建能力、项目脚手架和基础示例。

## 什么是迅雷微应用

迅雷微应用是运行在迅雷客户端内的扩展应用。开发者可以使用熟悉的 HTML、CSS、JavaScript、Vue 或 React 构建界面，并通过运行时注入的全局 `xunlei` 对象调用下载任务、本地存储、日志、设置等迅雷平台能力。

它适合开发下载管理、图片与音视频处理、效率工具、小游戏等功能。页面开发方式与普通 Web 应用基本一致，但页面资源需要随应用一起打包，受保护的平台能力也需要在 `manifest.json` 中声明权限。

完整的运行机制、能力边界和上架要求，请查看[迅雷微应用官方开发文档](https://open.xunlei.com/doc/miniapp/introduction)。

## 快速创建微应用

### 环境要求

- Node.js 20.19+ 或 22.12+
- pnpm、npm 或 yarn
- 支持微应用的迅雷桌面客户端

### 1. 创建项目

使用 npm：

```bash
npm create @xunlei-open/miniapp@latest
```

或使用 pnpm：

```bash
pnpm dlx @xunlei-open/create-miniapp@latest
```

脚手架会引导你选择：

- 项目名称；
- Vanilla、Vue 或 React；
- TypeScript 或 JavaScript；
- 可选的 ESLint + Prettier、Biome、Vitest；
- 是否立即安装依赖并启动。

也可以非交互创建：

```bash
pnpm dlx @xunlei-open/create-miniapp@latest my-miniapp \
  --yes \
  --framework vue \
  --variant typescript \
  --features lint,vitest
```

新项目默认包含一个创建迅雷下载任务的页面示例，但不包含 events：

```text
my-miniapp/
├── manifest.json
├── miniapp.config.ts
├── index.html
├── src/
│   ├── main.ts
│   └── App.vue
└── package.json
```

### 2. 本地开发

```bash
cd my-miniapp
pnpm install
pnpm dev
```

保持开发服务运行，然后在迅雷客户端的微应用页面选择“加载本地应用”

### 3. 配置开发工具

项目使用 `miniapp.config.ts` 统一配置开发、构建和打包工具。Vue/React 通过框架模块自动接入 Vite；alias、CSS、额外插件和开发服务器等配置仍可写在 `vite` 字段中：

```ts
import { defineConfig } from '@xunlei-open/miniapp'

export default defineConfig({
  modules: ['@xunlei-open/miniapp-module-vue'],
  vite: {
    build: {
      target: 'es2015',
    },
  },
})
```

### 4. 调用迅雷平台能力

`xunlei` 是运行时注入的全局对象，无需手动导入。下面的页面代码会创建一个下载任务：

```ts
const task = await xunlei.tasks.create({
  req: {
    url: 'https://example.com/file.zip',
  },
  opts: {
    name: '示例文件.zip',
  },
})

xunlei.logger.info('任务已创建', task.id)
```

同时需要在 `manifest.json` 中声明对应权限：

```json
{
  "permissions": ["tasks.create"]
}
```

更多 API 和权限说明见[平台能力](https://open.xunlei.com/doc/miniapp/platform-api)和[清单文件](https://open.xunlei.com/doc/miniapp/manifest)。

### 5. 构建

```bash
pnpm build
```

构建完成后，`dist` 目录就是微应用发布产物。它的顶层会直接包含 `manifest.json`、页面入口和静态资源。提交应用商店前的 ZIP 结构与检查项见[官方打包文档](https://open.xunlei.com/doc/miniapp/packaging)。

### 6. 打包 ZIP

```bash
pnpm run package
```

该命令会重新执行生产构建、校验 `manifest.json` 中引用的入口与资源，然后将 `dist` 内的文件打包到 `release/<name>-<version>.zip`。ZIP 顶层直接包含微应用文件，不会额外嵌套一层 `dist` 目录。

## 示例

- [`examples/basic-miniapp`](./examples/basic-miniapp)：脚手架默认生成的 Vanilla + TypeScript 最小示例。
- [`examples/task-manager-miniapp`](./examples/task-manager-miniapp)：Vue + TypeScript 任务管理示例，覆盖任务创建、列表、删除和视频文件播放。
- [`examples/github-release-miniapp`](./examples/github-release-miniapp)：React + TypeScript GitHub Release 下载示例，支持仓库地址解析、Assets 多选下载，页面和 `onResolve` 事件复用 Cheerio 解析器。

## 可选：让微应用处理下载事件

脚手架默认创建的是一个页面型微应用：用户打开微应用页面后，`src` 中的页面代码才会运行。大多数带界面的工具只需要这种方式，不必配置 events。

如果希望页面没有打开时，微应用也能在下载流程的特定阶段自动执行逻辑，就可以添加事件脚本（events）。例如，用户提交一个网站的页面地址后，事件脚本可以先解析出网站内资源下载地址，再交给迅雷创建任务。

支持的下载事件如下：

| 事件 | 触发时机 | 常见用途 |
| --- | --- | --- |
| `onResolve` | 用户提交下载地址后、任务创建前 | 解析页面地址，返回真实的下载资源 |
| `onStart` | 任务创建后、开始下载前 | 修改下载地址或补充任务信息 |
| `onError` | 下载任务发生错误时 | 刷新失效地址或决定是否继续任务 |
| `onDone` | 下载任务完成后 | 记录处理结果或发送完成通知 |

下面以 `onResolve` 为例，让微应用响应来自 `example.com` 的下载请求。

### 1. 编写事件脚本

新建 `src/events/onResolve.ts`：

```ts
xunlei.events.onResolve((ctx) => {
  xunlei.logger.info('开始解析下载地址', ctx.req.url)

  ctx.res = {
    name: '解析结果',
    size: 0,
    range: false,
    files: [
      {
        name: 'result.zip',
        path: 'result.zip',
        size: 0,
        req: {
          url: ctx.req.url,
        },
      },
    ],
  }
})
```

这段代码注册了一个 `onResolve` 回调。事件触发时，迅雷会传入本次下载请求的上下文 `ctx`；脚本完成解析后，通过 `ctx.res` 返回最终要下载的资源。示例为了保持简单，直接沿用了原始地址，实际项目可以在这里请求解析服务并替换 `req.url`。

### 2. 在 manifest 中声明事件

在 `manifest.json` 的 `scripts` 中声明何时加载这个事件脚本：

```json
{
  "scripts": [
    {
      "event": "onResolve",
      "match": {
        "urls": ["*://example.com/*"]
      },
      "entry": "events/onResolve.js"
    }
  ]
}
```

其中：

- `event` 是要响应的下载事件；
- `match.urls` 用来限制脚本响应哪些下载地址；
- `entry` 是构建后的脚本路径，不是 `src` 中的源文件路径。

### 3. 构建事件脚本

运行：

```bash
pnpm build
```

开发工具检测到 `src/events` 后，会通过内置的 Vite 构建能力自动编译其中的 `.ts` 和 `.js` 文件。上面的源文件最终会输出为：

```text
dist/events/onResolve.js
```

如果项目中没有 `src/events`，插件会跳过事件构建，不影响普通页面的开发和打包。

`pnpm dev` 同样会生成 `dist/events` 中的事件脚本，并在脚本及导入依赖修改时自动重建，新增、删除事件源码也会同步。页面继续使用 Vite HMR，事件脚本则由宿主沙箱加载本地产物；宿主若缓存脚本，需要重新加载应用。manifest 中声明的应用图标也会在 dev 时复制并随文件修改同步；修改 manifest 本身后仍需重启 dev 并重新加载应用。

### 运行限制

- 事件脚本运行在独立沙箱中，不包含 DOM，不能操作页面；
- 事件触发时不要求用户打开微应用页面；
- 事件脚本中不会注入 `xunlei.tasks`，任务控制需要通过事件上下文 `ctx` 完成；
- 如果事件脚本需要发起网络请求，还要在 `manifest.json` 中声明 `network` 权限和允许访问的 URL。

更完整的匹配规则、上下文结构和事件示例，请查看[官方钩子事件文档](https://open.xunlei.com/doc/miniapp/events)。

## 在本仓库开发

仓库开发环境使用 Node.js 22.18+ 和 pnpm 10：

```bash
pnpm install
pnpm verify
```

常用命令：

```bash
pnpm dev       # 启动基础示例
pnpm check     # TypeScript 类型检查
pnpm test      # 运行测试
pnpm build     # 构建所有包和示例
pnpm verify    # 完整执行检查、测试和构建
```

## 相关文档

- [快速上手](https://open.xunlei.com/doc/miniapp/quick-start)
- [manifest.json](https://open.xunlei.com/doc/miniapp/manifest)
- [平台能力](https://open.xunlei.com/doc/miniapp/platform-api)
- [钩子事件](https://open.xunlei.com/doc/miniapp/events)
- [打包与上架](https://open.xunlei.com/doc/miniapp/packaging)

## License

[MIT](./LICENSE)
