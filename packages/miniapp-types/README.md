# @xunlei-open/miniapp-types

迅雷微应用 manifest、任务 API、生命周期事件和运行时能力的 TypeScript 类型。

```bash
pnpm add -D @xunlei-open/miniapp-types
```

在 `tsconfig.json` 中启用全局类型：

```json
{
  "compilerOptions": {
    "types": ["@xunlei-open/miniapp-types"]
  }
}
```

之后可直接获得 `xunlei` 和 `MessageError` 的类型提示，也可按需导入类型：

```ts
import type { MiniappManifest, OnResolveContext } from '@xunlei-open/miniapp-types'
```
