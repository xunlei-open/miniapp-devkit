# Xunlei Miniapp Devkit

[![CI](https://github.com/xunlei-open/miniapp-devkit/actions/workflows/ci.yml/badge.svg)](https://github.com/xunlei-open/miniapp-devkit/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

迅雷微应用的独立开发工具仓库，包含运行时类型、Vite 构建插件、项目脚手架和一个最小可运行示例。

## Packages

| Package | 用途 |
| --- | --- |
| [`@xunlei-open/miniapp-types`](./packages/miniapp-types) | `manifest.json`、任务 API、生命周期事件和 `xunlei` 全局对象的 TypeScript 类型 |
| [`@xunlei-open/vite-plugin-miniapp`](./packages/vite-plugin-miniapp) | 构建页面与 `src/events/*` 多入口，并复制 manifest 和图标 |
| [`@xunlei-open/create-miniapp`](./packages/create-miniapp) | 创建 Vanilla、Vue 或 React 的 JavaScript/TypeScript 微应用 |

## 快速开始

使用脚手架创建项目：

```bash
npm create @xunlei-open/miniapp@latest
```

也可以通过完整包名运行：

```bash
npx @xunlei-open/create-miniapp@latest my-miniapp
```

脚手架支持 Vanilla、Vue、React，均可选择 JavaScript 或 TypeScript，并可选 ESLint + Prettier、Biome 和 Vitest。

## 在本仓库开发

贡献者需要 Node.js 22.18+ 和 pnpm 10：

```bash
pnpm install
pnpm verify
pnpm dev
```

- `pnpm build`：按 workspace 依赖顺序构建全部包和示例。
- `pnpm check`：运行 TypeScript 静态检查。
- `pnpm test`：运行脚手架与 Vite 插件测试。
- `pnpm dev`：启动 [`examples/basic-miniapp`](./examples/basic-miniapp)。

三个发布包都通过 `tsdown.config.ts` 构建。库包产出 ESM、CommonJS、类型声明和 sourcemap；CLI 产出带 shebang 的 Node.js ESM 可执行文件。

## 仓库结构

```text
miniapp-devkit/
├── examples/
│   └── basic-miniapp/
├── packages/
│   ├── create-miniapp/
│   ├── miniapp-types/
│   └── vite-plugin-miniapp/
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

微应用开发与 manifest 说明见[开发指南](./packages/create-miniapp/PLUGIN-DEV-GUIDE.md)。

## 发布

发布前先运行：

```bash
pnpm verify
pnpm --filter @xunlei-open/miniapp-types publish --access public
pnpm --filter @xunlei-open/vite-plugin-miniapp publish --access public
pnpm --filter @xunlei-open/create-miniapp publish --access public
```

首次发布 scoped package 前，需要确认 npm 组织 `@xunlei-open` 已创建且当前账号拥有发布权限。

## License

[MIT](./LICENSE)
