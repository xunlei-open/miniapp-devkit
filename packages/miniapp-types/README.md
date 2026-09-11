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
