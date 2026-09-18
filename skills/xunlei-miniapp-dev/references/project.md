# 工程与交付

## 创建工程

环境要求 Node.js 22.18+，宿主验证使用支持微应用的 Windows 迅雷客户端。在用户指定的父目录执行，将名称和技术栈替换为实际选择：

```bash
npx @xunlei-open/create-miniapp@latest my-miniapp --yes --framework vue --variant typescript --package-manager npm --no-install
cd my-miniapp
npm install
```

框架选项按 Vue、React、Vanilla 排列；交互模式和 `--yes` 未指定框架时默认 Vue，语言默认 TypeScript。用户指定技术栈时遵循其选择。`--framework` 支持 `vue|react|vanilla`；`--variant` 支持 `typescript|javascript`；`--package-manager` 支持 `npm|pnpm|yarn`。按需添加 `--features lint,vitest` 或 `--features biome`，lint 与 biome 互斥，Vue 的 Biome 支持为实验性。`--no-install` 避免脚手架安装后直接进入长驻开发服务，随后单独安装和启动。已有工程不要重新生成，沿用其锁文件。

## 文件职责

资源路径、开发服务器默认配置和 Worker 构建见 [运行环境与构建选择](runtime.md)。

| 文件 | 用途 |
| --- | --- |
| `manifest.json` | 应用信息、宿主入口、权限、事件和设置 |
| `miniapp.config.ts` / `.js` | devkit 配置，额外 Vite 配置放入 `vite` |
| `index.html`、`src/main.*` | 页面入口与源码 |
| `src/vite-env.d.ts` | 全局类型引用 |
| `dist/` | 默认开发输出，供宿主加载与 HMR |
| `output/`、`output/*.zip` | 默认生产构建与 ZIP 输出 |

Vue 配置示例；React 替换为 `@xunlei-open/miniapp-module-react` 并安装对应模块，Vanilla 不需要框架模块：

```ts
import { defineConfig } from '@xunlei-open/miniapp';
export default defineConfig({
  modules: ['@xunlei-open/miniapp-module-vue'],
  vite: {},
});
```

在项目包含的声明文件中保留：

```ts
/// <reference types="vite/client" />
/// <reference types="@xunlei-open/miniapp-types" />
```

## 页面清单

完整字段见 [类型参考](api-types.ts) 中的 `MiniappManifest`。

下面是创建下载任务的最小页面清单，按需求替换名称与文案：

```json
{
  "manifest_version": 1,
  "name": "my-miniapp",
  "title": "我的下载助手",
  "version": "1.0.0",
  "entry": { "type": "miniapp", "url": "index.html" },
  "window": { "width": 900, "height": 700 },
  "permissions": ["tasks.create"]
}
```

`name`、`title`、`version` 必填；版本使用 semver，更新发布时递增。默认入口的 `entry.url`、`icon`、`scripts[].entry` 为相对包根目录路径，不能越界、用绝对路径或远程 URL。图标只有实际存在并进入产物后才声明；使用脚手架现有静态资源约定。

窗口与页面布局见 [响应式布局](responsive-ui.md)；下载生命周期扩展见 [事件脚本](events.md)。

## 应用内路由

需要路由时保持单一 `index.html` 入口，通过 URL 的 Hash 切换视图：

- Vue Router 使用 `createWebHashHistory()`。
- React Router 使用 `HashRouter`；使用数据路由时选 `createHashRouter()`。
- Vanilla 可用 `location.hash` 与 `hashchange` 实现简单导航。

## 调试和打包

```bash
npm run dev
```

保持服务运行，在迅雷「微应用 → 加载本地应用」选择终端提示的输出目录，默认 `dist`。页面支持 HMR；清单变更需重启服务并重载应用，事件或图标若有宿主缓存也需重载。

开发与生产输出隔离：`dev.outDir` 默认 `dist`，`vite.build.outDir` 默认 `output`，`package.outDir` 默认 `output`。开发目录与生产目录不能相同或互相包含。使用这些隔离目录时，可以保持 dev 运行并执行 build/package。已有旧版 devkit 若仍将开发和构建写入同一目录，不要在开发会话中执行会覆盖该目录的 build、package 或组合验证脚本；先用类型检查、相关测试和宿主调试验证。

构建不包含类型检查，按项目脚本单独执行；Vue 工程使用 `vue-tsc` 检查 SFC。

```bash
npm run build
npm run package
```

`build` 包含产物校验；`package` 默认重新构建。需要单独检查已有产物时用 `npm exec -- xunlei-miniapp validate`；已有经过检查的生产构建可用 `npm exec -- xunlei-miniapp package --no-build`，不能拿开发输出直接打包。

`build` 产物直接位于 `output/`；`package` 成功生成 ZIP 后清理本次构建文件，默认目录中只留下 ZIP。失败时保留构建文件，`--no-build` 也不清理已有产物。打包清理后若需校验目录或加载生产页面，应重新 build；下一次默认构建会清空 output，需保留的 ZIP 应另行保存。

检查 ZIP 第一层直接包含 `manifest.json`、页面和资源，不能套 `dist/` 或项目目录；声明入口和图标存在，无开发入口、符号链接、无关源码或 `node_modules`。

UI 验证见 [响应式布局](responsive-ui.md)。宿主验证覆盖相关功能与失败反馈；打包与上架是独立事项。

## 安装体验指引

交付时提供两种体验方式，按项目实际的包管理器、脚本和输出路径调整说明：

1. **本地加载应用（推荐开发调试）**：运行 `npm run dev` 并保持服务运行，在迅雷微应用管理页面点击「加载本地应用」，选择 `dist` 目录。页面修改支持 HMR；清单修改后重启开发服务并重载应用。
2. **拖拽 ZIP 安装**：运行 `npm run package` 后，将 `output` 目录中生成的 ZIP 直接拖拽到迅雷微应用管理页面进行安装。此方式使用生产产物，无需启动 dev server；代码更新后重新打包安装。

给出实际的目录和 ZIP 文件路径；未执行打包时说明如何生成，不声称安装包已经存在。
