# 迅雷微应用开发指南

本文说明脚手架生成项目的基本结构、manifest 配置和常用运行时 API。完整 API 类型以 `@xunlei-open/miniapp-types` 为准。

## 创建项目

```bash
npm create @xunlei-open/miniapp@latest
```

构建后的 `dist` 是宿主安装的微应用目录：

```text
my-miniapp/
├── manifest.json
├── index.html
├── src/
│   ├── main.ts
│   └── events/
│       └── onResolve.ts
└── dist/
    ├── manifest.json
    ├── index.html
    ├── events/
    │   └── onResolve.js
    └── assets/
```

## Manifest

```json
{
  "manifest_version": 1,
  "name": "example-miniapp",
  "title": "示例微应用",
  "description": "一个最小示例",
  "version": "1.0.0",
  "entry": {
    "type": "miniapp",
    "url": "index.html"
  },
  "window": {
    "width": 900,
    "height": 700
  },
  "permissions": ["tasks.create"],
  "scripts": [
    {
      "event": "onResolve",
      "match": { "urls": ["*://github.com/*"] },
      "entry": "events/onResolve.js"
    }
  ]
}
```

页面入口使用包内相对 URL。事件入口填写构建产物中相对于 `dist` 的路径，不要加 `dist/` 前缀。

## 使用任务 API

```ts
const task = await xunlei.tasks.create({
  req: {
    url: 'https://example.com/archive.zip',
  },
  opts: {
    name: 'archive.zip',
  },
})

const list = await xunlei.tasks.list({ limit: 20 })
const detail = await xunlei.tasks.detail({ id: task.id })

await xunlei.tasks.delete({
  id: detail.id,
  deleteFiles: false,
})
```

manifest 中需声明实际使用的权限，例如 `tasks.create`、`tasks.list`、`tasks.detail` 或 `tasks.delete`。

## 编写生命周期事件

```ts
xunlei.events.onResolve((ctx) => {
  ctx.res = {
    name: 'example-resource',
    size: 0,
    range: false,
    files: [
      {
        name: 'archive.zip',
        path: 'archive.zip',
        size: 0,
        req: { url: ctx.req.url },
      },
    ],
  }
})
```

支持 `onResolve`、`onStart`、`onError` 和 `onDone`。事件源文件默认放在 `src/events`，Vite 插件会分别输出为 `dist/events/*.js`。

## TypeScript 类型

脚手架的 TypeScript 模板已配置类型包。手动创建项目时可添加：

```bash
pnpm add -D @xunlei-open/miniapp-types
```

```json
{
  "compilerOptions": {
    "types": ["@xunlei-open/miniapp-types"]
  }
}
```

## 运行环境限制

- 微应用运行在受限 Web 环境中，业务代码不应依赖 Node.js API。
- 页面与事件所需的 JavaScript、CSS 和静态资源应全部包含在构建产物内。
- 只申请实际使用的权限；网络访问还需在 manifest 的 `network.urls` 中声明允许范围。
