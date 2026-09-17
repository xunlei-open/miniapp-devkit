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

### 事件依赖与开发重建

事件入口输出在 `events/`；公共分块、Worker、WASM 等依赖可以按 Vite 默认规则输出到 `assets/`，无需在应用中强制配置 `events/assets/`。Worker 及其依赖修改也会触发事件重建。

开发模式先完成整个构建和校验，再写入依赖，最后逐个原子替换事件入口。编译或校验失败保留已有产物。输出路径必须位于输出目录内，不允许符号链接绕过边界，不得覆盖页面入口、清单或图标。与已有依赖同名且内容不同会报错；请使用包含内容哈希的依赖文件名。同内容资源可以复用。

开发会话期间保留旧依赖，让已经运行的事件和 Worker 仍能加载旧版本；删除源码只清理本次会话拥有且未被外部修改的事件入口。旧哈希资源会增加磁盘占用；停止 dev 后，默认的生产全量构建会清理输出目录，仅保留本次产物。自定义 `emptyOutDir: false` 时由应用自行管理旧文件。

多个入口不是一个原子事务，事件构建与独立的外部写文件进程也不构成跨进程锁；不要让 dev 和生产构建同时写同一个输出目录。入口更新后仍需按宿主缓存行为重载应用。

[示例代码](https://github.com/xunlei-open/miniapp-devkit/tree/main/examples) · [官方文档](https://open.xunlei.com/doc/miniapp/introduction)
