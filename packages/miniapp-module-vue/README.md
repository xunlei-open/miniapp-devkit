# @xunlei-open/miniapp-module-vue

在项目中安装此模块，并配置：

```ts
import { defineConfig } from '@xunlei-open/miniapp'

export default defineConfig({
  modules: ['@xunlei-open/miniapp-module-vue'],
})
```

模块自动注册 vue 的 Vite 插件。不执行类型检查；build 和 package 使用统一 CLI 命令。
