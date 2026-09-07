# @xunlei-open/miniapp

迅雷微应用统一开发工具，内部复用 Vite，提供开发、构建、校验和打包命令。

```bash
pnpm add -D @xunlei-open/miniapp
```

```json
{
  "scripts": {
    "dev": "xunlei-miniapp",
    "build": "xunlei-miniapp build",
    "package": "xunlei-miniapp package"
  }
}
```

项目使用 `miniapp.config.ts` 作为唯一工具配置：

```ts
import { defineConfig } from '@xunlei-open/miniapp'

export default defineConfig({
  vite: {
    build: {
      target: 'es2015',
    },
  },
})
```

框架插件、alias、CSS、开发服务器等 Vite 配置均写在 `vite` 字段中。`manifest.json` 继续作为迅雷运行时读取的应用清单。

## 命令

```bash
xunlei-miniapp                 # 启动开发服务
xunlei-miniapp build           # 构建并校验 dist
xunlei-miniapp package         # 构建、校验并生成 ZIP
xunlei-miniapp package --no-build
xunlei-miniapp validate         # 校验当前配置对应的构建目录
```
