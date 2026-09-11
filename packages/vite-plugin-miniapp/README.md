# @xunlei-open/vite-plugin-miniapp

迅雷微应用的底层 Vite 构建插件，处理应用清单、图标和事件脚本。一般项目使用 [@xunlei-open/miniapp](https://github.com/xunlei-open/miniapp-devkit/tree/main/packages/miniapp) 即可。

需要直接接入 Vite 时：

```bash
pnpm add -D @xunlei-open/vite-plugin-miniapp vite
```

```ts
import miniapp from '@xunlei-open/vite-plugin-miniapp'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [miniapp()],
})
```

默认读取 `manifest.json`，将清单和图标复制到构建目录，并将 `src/events` 中的事件脚本构建到 `events/`。没有事件脚本时无需创建该目录。

[官方开发文档](https://open.xunlei.com/doc/miniapp/introduction)
