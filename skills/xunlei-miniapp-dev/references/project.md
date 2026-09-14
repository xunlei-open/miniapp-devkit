# 工程与交付

## 创建工程

环境要求 Node.js 22.18+，宿主验证使用支持微应用的 Windows 迅雷客户端。在用户指定的父目录执行，将名称和技术栈替换为实际选择：

```bash
npx @xunlei-open/create-miniapp@latest my-miniapp --yes --framework vanilla --variant typescript --package-manager npm --no-install
cd my-miniapp
npm install
```

`--framework` 支持 `vanilla|vue|react`；`--variant` 支持 `typescript|javascript`；`--package-manager` 支持 `npm|pnpm|yarn`。按需添加 `--features lint,vitest` 或 `--features biome`，lint 与 biome 互斥，Vue 的 Biome 支持为实验性。`--no-install` 避免脚手架安装后直接进入长驻开发服务，随后单独安装和启动。已有工程不要重新生成，沿用其锁文件。

## 文件职责

| 文件 | 用途 |
| --- | --- |
| `manifest.json` | 应用信息、宿主入口、权限、事件和设置 |
| `miniapp.config.ts` / `.js` | devkit 配置，额外 Vite 配置放入 `vite` |
| `index.html`、`src/main.*` | 页面入口与源码 |
| `src/vite-env.d.ts` | 全局类型引用 |
| `dist/`、`release/` | 默认构建输出与 ZIP 输出 |

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

默认保留上述包内页面入口，先完成页面交互和平台调用。仅在需要介入下载生命周期时，按 [事件脚本](events.md) 添加事件源码与 scripts 声明。

## 调试和打包

```bash
npm run dev
```

保持服务运行，在迅雷「微应用 → 加载本地应用」选择终端提示的输出目录，默认 `dist`。页面支持 HMR；清单变更需重启服务并重载应用，事件或图标若有宿主缓存也需重载。

先读 `package.json` 再运行实际存在的检查脚本。TypeScript 工程执行 `typecheck` 或等效检查：Vanilla / React 按配置使用 `tsc --noEmit` 或 `tsc -b`，Vue 使用 `vue-tsc` 检查 SFC。不要调用不存在的脚本；构建不能替代类型检查。

```bash
npm run build
npm run package
```

`build` 包含产物校验；`package` 默认重新构建。需要单独检查已有产物时用 `npm exec -- xunlei-miniapp validate`；已有经过检查的生产构建可用 `npm exec -- xunlei-miniapp package --no-build`，不能拿开发输出直接打包。

检查 ZIP 第一层直接包含 `manifest.json`、页面和资源，不能套 `dist/` 或项目目录；声明入口和图标存在，无开发入口、符号链接、无关源码或 `node_modules`。

涉及 UI 布局的改动按 [响应式布局](responsive-ui.md) 检查窄屏到桌面窗口的表现。有宿主时验证核心用户流程与相关失败反馈。没有宿主时完成本地检查并提供具体加载和验证步骤。打包完成即可交付，除非用户还要求上架。

## devkit 源码定位

在本仓库分发位置，技能目录的 `../..` 是 devkit 根目录；技能被单独安装时应定位用户提供的 checkout，不能假设相对路径仍成立。

- `packages/create-miniapp/src/index.ts`：脚手架参数。
- `packages/miniapp/README.md`、`packages/miniapp/src`：开发、构建和打包行为。
- `packages/miniapp-types/src/index.ts`：清单和平台 API 类型标准。
- `examples/basic-miniapp`：Vanilla + TypeScript 下载表单。
- `examples/task-manager-miniapp`：Vue + TypeScript 任务管理和文件预览。
- `examples/github-release-miniapp`：React + TypeScript 解析事件和任务组。

按需求读取示例，不照搬示例域名、名称、权限或依赖版本。修改 devkit 工具链时遵守仓库验证要求，根目录 `pnpm verify` 执行检查、测试和构建；独立应用使用自身脚本。
