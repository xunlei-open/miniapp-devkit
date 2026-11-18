# @xunlei-open/miniapp-types

迅雷微应用清单、任务 API、生命周期事件和运行时能力的 TypeScript 类型。

```bash
pnpm add -D @xunlei-open/miniapp-types
```

在 `tsconfig.json` 的 `compilerOptions.types` 中加入：

```json
{
  "compilerOptions": {
    "types": ["@xunlei-open/miniapp-types"]
  }
}
```

可获得全局 `xunlei`、`MessageError` 的类型提示，也可按需导入：

```ts
import type { MiniappManifest, OnResolveContext } from '@xunlei-open/miniapp-types'
```

本包只提供类型，运行时能力由迅雷宿主注入。API 用法见[官方文档](https://open.xunlei.com/doc/miniapp/platform-api)。

在微应用页面中，用系统默认程序打开已完成的下载文件：

```ts
await xunlei.host.ui.openTaskFile({ taskId: '123', fileIndex: 0 })
```

`fileIndex` 是该任务 `meta.res.files` 数组中的下标，从 0 开始；任务组中的文件使用对应子任务 ID。该接口无需声明权限。返回的 `Promise<void>` 在系统接受打开请求后完成，不代表文件已被查看；文件未完成、不存在、无法访问或宿主不支持该能力时 reject。
