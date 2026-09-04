# @xunlei-open/vite-plugin-miniapp

将微应用页面和生命周期事件构建为宿主可安装的 `dist` 目录。

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

默认读取 `src/events/*.{ts,js}` 和根目录的 `manifest.json`。构建后事件位于 `dist/events`，manifest 及其 `icon` 文件会复制到 `dist`。

```ts
miniapp({
  eventsDir: 'src/events',
  eventsExtensions: ['.ts', '.js'],
  manifestFile: 'manifest.json',
})
```
