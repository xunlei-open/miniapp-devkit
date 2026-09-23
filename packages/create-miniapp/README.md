# @xunlei-open/create-miniapp

迅雷微应用项目脚手架，支持 Vue、React、Vanilla 的 JavaScript / TypeScript 模板。框架选项按此顺序排列，交互模式和 `--yes` 默认使用 Vue + TypeScript；可通过 `--framework` 和 `--variant` 显式指定。

## 创建项目

建议使用 Node.js 22.18+：

```bash
npm create @xunlei-open/miniapp@latest
```

按提示选择框架、语言和可选工具：ESLint + Prettier、Biome 或 Vitest。Lint 与 Biome 二选一；Vue 的 Biome 支持为实验性。

也可指定参数：

```bash
npx @xunlei-open/create-miniapp@latest my-app --yes --framework vue --variant typescript --features lint,vitest --no-install
```

## 开发与打包

```bash
cd my-app
npm install
npm run dev
npm run package
```

开发时在迅雷客户端中加载本地应用的目录，保持 dev server 运行。打包结果位于 `output/`。

生成项目包含创建下载任务的页面示例。所有模板使用 `900 × 600` 的窗口内容尺寸；`entry.type` 省略，使用默认的 `miniapp` 入口。应用信息和权限在 `manifest.json` 中配置，开发与构建配置使用 `miniapp.config.ts` 或 `.js`。

[项目入口](https://github.com/xunlei-open/miniapp-devkit#readme) · [官方文档](https://open.xunlei.com/doc/miniapp/introduction)
