# 迅雷微应用开发工具

[![CI](https://github.com/xunlei-open/miniapp-devkit/actions/workflows/ci.yml/badge.svg)](https://github.com/xunlei-open/miniapp-devkit/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

`miniapp-devkit` 是迅雷微应用的开源开发工具仓库，提供 TypeScript 类型、Vite 构建插件、项目脚手架和基础示例。

## 什么是迅雷微应用

迅雷微应用是运行在迅雷客户端内的扩展应用。开发者可以使用熟悉的 HTML、CSS、JavaScript、Vue 或 React 构建界面，并通过运行时注入的全局 `xunlei` 对象调用下载任务、本地存储、日志、设置等迅雷平台能力。

它适合开发下载管理、图片与音视频处理、效率工具、小游戏等功能。页面开发方式与普通 Web 应用基本一致，但页面资源需要随应用一起打包，受保护的平台能力也需要在 `manifest.json` 中声明权限。

完整的运行机制、能力边界和上架要求，请查看[迅雷微应用官方开发文档](https://open.xunlei.com/doc/miniapp/introduction)。

## 仓库内容

| Workspace | 说明 |
| --- | --- |
| [`packages/create-miniapp`](./packages/create-miniapp) | `@xunlei-open/create-miniapp`，用于创建 Vanilla、Vue、React 的 JavaScript 或 TypeScript 项目 |
| [`packages/vite-plugin-miniapp`](./packages/vite-plugin-miniapp) | `@xunlei-open/vite-plugin-miniapp`，构建页面和可选事件入口，并复制 manifest、图标等发布文件 |
| [`packages/miniapp-types`](./packages/miniapp-types) | `@xunlei-open/miniapp-types`，提供 manifest、平台 API、任务和生命周期事件类型 |
| [`examples/basic-miniapp`](./examples/basic-miniapp) | 一个不包含 events 的基础页面微应用，演示如何调用任务 API |

三个发布包均使用 [tsdown](https://tsdown.dev/) 构建。库包同时提供 ESM、CommonJS 和类型声明，脚手架构建为 Node.js ESM 命令行程序。

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

新项目默认是一个简单的页面微应用，不包含 events：

```text
my-miniapp/
├── manifest.json
├── index.html
├── src/
│   ├── main.ts
│   └── App.vue
├── public/
├── vite.config.ts
└── package.json
```

### 2. 本地开发

```bash
cd my-miniapp
pnpm install
pnpm dev
```

保持开发服务运行，然后在迅雷客户端的微应用页面选择“加载本地应用”，选中项目根目录。页面代码修改后可以通过 Vite HMR 更新；修改 `manifest.json` 后需要在客户端重新加载应用。

### 3. 调用迅雷平台能力

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

### 4. 构建

```bash
pnpm build
```

构建完成后，`dist` 目录就是微应用发布产物。它的顶层会直接包含 `manifest.json`、页面入口和静态资源。提交应用商店前的 ZIP 结构与检查项见[官方打包文档](https://open.xunlei.com/doc/miniapp/packaging)。

## 可选：添加 events

普通页面微应用不需要 events。当应用需要在用户打开页面之外，自动介入下载任务的解析、开始、失败或完成流程时，再添加事件脚本。

### 1. 创建事件文件

创建 `src/events/onResolve.ts`：

```ts
xunlei.events.onResolve((ctx) => {
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

`vite-plugin-miniapp` 会自动发现 `src/events` 下的 `.ts` 和 `.js` 文件，并把它构建为：

```text
dist/events/onResolve.js
```

### 2. 在 manifest 中声明事件

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

当前支持 `onResolve`、`onStart`、`onError` 和 `onDone`。事件脚本运行在独立沙箱中，没有 DOM，也不会注入 `xunlei.tasks`；任务控制通过事件上下文完成。涉及网络请求时，还需要配置 `network` 权限和 URL 白名单。

事件触发时机、匹配规则和上下文能力以[官方钩子事件文档](https://open.xunlei.com/doc/miniapp/events)为准。

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
