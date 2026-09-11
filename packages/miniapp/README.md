# @xunlei-open/miniapp

迅雷微应用开发工具，支持页面应用、事件应用及两者组合，提供开发、构建、校验和 ZIP 打包命令。

## 使用

```bash
pnpm add -D @xunlei-open/miniapp
pnpm exec xunlei-miniapp
```

在迅雷客户端中加载本地应用的目录（默认 `dist`）。页面开发需要保持 dev server 运行；修改 `manifest.json` 后重启开发服务并重新加载应用。

## 命令

| 命令 | 用途 |
| --- | --- |
| `xunlei-miniapp` | 开发与热更新 |
| `xunlei-miniapp build` | 构建并校验生产产物 |
| `xunlei-miniapp validate` | 校验已有构建产物 |
| `xunlei-miniapp package` | 构建、校验并生成 ZIP |
| `xunlei-miniapp package --no-build` | 校验并打包已有生产产物 |

默认输出目录为 `dist/`，ZIP 位于 `release/`。构建与打包不自动执行类型检查。

## 配置

应用清单使用 `manifest.json`，工具配置使用 `miniapp.config.ts` 或 `.js`：

```ts
import { defineConfig } from '@xunlei-open/miniapp'

export default defineConfig({
  modules: ['@xunlei-open/miniapp-module-vue'],
  vite: {},
})
```

Vue / React 项目安装并声明对应框架模块；Vanilla 无需模块。额外 Vite 配置写在 `vite` 中。

事件源码默认放在 `src/events`，并在 manifest 的 `scripts` 中声明。纯事件应用无需页面入口。事件或图标更新后，宿主若有缓存需重新加载应用。

[示例代码](https://github.com/xunlei-open/miniapp-devkit/tree/main/examples) · [官方文档](https://open.xunlei.com/doc/miniapp/introduction)
