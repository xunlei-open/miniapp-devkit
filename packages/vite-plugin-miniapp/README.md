# @xunlei-open/vite-plugin-miniapp

将微应用页面和生命周期事件构建为宿主可安装的 `dist` 目录。

普通微应用项目建议直接使用 `@xunlei-open/miniapp` 统一运行开发、构建和打包命令。本包是底层 Vite 集成层，适合开发工具内部使用或需要直接控制 Vite 的高级场景。

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

插件默认读取根目录的 `manifest.json`，并将 manifest 及其 `icon` 文件复制到 `dist`。项目不需要创建事件目录；如果存在 `src/events/*.{ts,js}`，插件会自动把它们构建到 `dist/events`。

```ts
miniapp({
  eventsDir: 'src/events',
  eventsExtensions: ['.ts', '.js'],
  manifestFile: 'manifest.json',
})
```
