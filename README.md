# 迅雷微应用开发工具

[![CI](https://github.com/xunlei-open/miniapp-devkit/actions/workflows/ci.yml/badge.svg)](https://github.com/xunlei-open/miniapp-devkit/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

用于开发运行在迅雷客户端中的微应用，提供项目脚手架、开发与打包命令、框架集成和 TypeScript 类型。支持 Vanilla、Vue、React，以及 JavaScript / TypeScript。

## 快速开始

准备 Node.js 22.18+ 和支持微应用的迅雷客户端：

```bash
npm create @xunlei-open/miniapp@latest my-miniapp
cd my-miniapp
npm install
npm run dev
```

在迅雷客户端中加载终端提示的开发目录（默认 `dist`），并保持 dev server 运行。普通浏览器不提供全局 `xunlei` 平台能力。

```bash
npm run build      # 生成生产产物 output/
npm run package    # 构建并生成 output/ 下的 ZIP
```

应用信息和权限写在 `manifest.json`；开发与构建配置写在 `miniapp.config.ts` 或 `miniapp.config.js`。完整用法见[官方开发文档](https://open.xunlei.com/doc/miniapp/introduction)。

## 使用 Skill 一句话开发

安装[迅雷微应用开发 Skill](./skills/xunlei-miniapp-dev/SKILL.md)，让 AI Agent 帮助你创建页面、接入平台能力并完成打包。在目标项目目录执行以下命令，并按提示选择使用的 AI Agent ：

```bash
npx skills add xunlei-open/miniapp-devkit
```

安装后，在 AI Agent 中输入一句话即可开始，例如：

> 使用 $xunlei-miniapp-dev 帮我开发一个迅雷图片裁剪微应用，支持选择本地图片、调整裁剪区域、预览并通过迅雷下载裁剪结果，完成后构建并打包。

最终 AI Agent 生成的产物可参考[图片裁剪工具示例](./examples/image-cut-miniapp/)，了解本地图片处理与迅雷下载能力的结合方式。

## 示例代码

| 示例 | 技术栈 | 重点 |
| --- | --- | --- |
| [基础微应用](./examples/basic-miniapp/) | Vanilla + TypeScript | 创建下载任务，最小入门项目 |
| [图片裁剪工具](./examples/image-cut-miniapp/) | Vue + TypeScript | 本地图片裁剪、实时预览、通过 Blob 创建下载任务 |
| [任务管理器](./examples/task-manager-miniapp/) | Vue + TypeScript | 任务与任务组管理、视频预览 |
| [GitHub Release 下载](./examples/github-release-miniapp/) | React + TypeScript | 解析资源、创建任务组、下载解析事件 |

各示例的 README 提供运行和打包命令。

## 工具包

| 包 | 用途 |
| --- | --- |
| [create-miniapp](./packages/create-miniapp/) | 创建项目，选择框架与可选工具 |
| [miniapp](./packages/miniapp/) | 开发、构建、校验与打包 |
| [miniapp-types](./packages/miniapp-types/) | 清单和平台 API 类型 |
| [miniapp-module-vue](./packages/miniapp-module-vue/) | Vue 集成 |
| [miniapp-module-react](./packages/miniapp-module-react/) | React 集成 |
| [vite-plugin-miniapp](./packages/vite-plugin-miniapp/) | 底层 Vite 构建插件 |

## 仓库开发

使用 Node.js 22.18+ 和 pnpm 10，在仓库根目录执行：

```bash
pnpm install
pnpm build
pnpm --filter basic-miniapp dev
```

提交前运行 `pnpm verify`，执行检查、测试和构建。

## 文档

[快速上手](https://open.xunlei.com/doc/miniapp/quick-start) · [应用清单](https://open.xunlei.com/doc/miniapp/manifest) · [平台 API](https://open.xunlei.com/doc/miniapp/platform-api) · [下载事件](https://open.xunlei.com/doc/miniapp/events) · [打包与上架](https://open.xunlei.com/doc/miniapp/packaging)

[MIT License](./LICENSE)
