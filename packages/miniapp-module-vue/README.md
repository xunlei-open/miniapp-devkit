# @xunlei-open/miniapp-module-vue

为迅雷微应用接入 Vue，自动注册对应的 Vite 插件。

```bash
pnpm add -D @xunlei-open/miniapp-module-vue
```

在 `miniapp.config.ts` 或 `.js` 中配置：

```ts
import { defineConfig } from '@xunlei-open/miniapp'

export default defineConfig({
  modules: ['@xunlei-open/miniapp-module-vue'],
})
```

开发和打包使用 [@xunlei-open/miniapp](https://github.com/xunlei-open/miniapp-devkit/tree/main/packages/miniapp) 的统一命令；类型检查需单独执行。
