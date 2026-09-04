# @xunlei-open/create-miniapp

迅雷开放平台前端脚手架 CLI（自研命令行 + EJS 模板引擎）。

- 微应用开发说明见[仓库 README](https://github.com/xunlei-open/miniapp-devkit#readme)，完整能力以[官方开发文档](https://open.xunlei.com/doc/miniapp/introduction)为准。

## 环境要求

- **Node.js** 20.19+ 或 22.12+（模板使用 Vite 8，[官方要求](https://vite.dev/blog/announcing-vite8#node-js-support)；含 Vitest / jsdom 29）

## 能力

| Framework | Variant | 模板 ID | 包含 |
|-----------|---------|---------|------|
| Vanilla | TypeScript | `vanilla-ts` | Vite 8、TypeScript；可选 Lint / Biome / Vitest |
| Vanilla | JavaScript | `vanilla` | Vite 8；可选 Lint / Biome / Vitest |
| Vue | TypeScript | `vue-ts` | Vite 8、Vue 3；可选 Lint / Biome（Experimental）/ Vitest |
| Vue | JavaScript | `vue` | 同上（JavaScript） |
| React | TypeScript | `react-ts` | Vite 8、React 19；可选 Lint / Biome / Vitest |
| React | JavaScript | `react` | 同上（JavaScript） |

**Lint** = ESLint + Prettier + `eslint-plugin-prettier`（规则 `prettier/prettier: error`）。编辑时红线依赖本机 ESLint 扩展读取项目配置，无需 `.vscode` 工作区文件。

**Biome** = `@biomejs/biome` 一体 lint + format，生成 `biome.json` 与 `.vscode/settings.json`。Vue 模板对 `.vue` SFC 支持为实验性，交互选项标注 `(Experimental)`。

生成的项目默认是纯页面微应用，不包含 `src/events` 或 manifest `scripts`。需要介入下载任务生命周期时，可按照根目录 README 的“可选：添加 events”章节手动添加。

## 使用

```bash
# 创建项目（推荐）
npm create @xunlei-open/miniapp@latest

# 等价写法
npx @xunlei-open/create-miniapp@latest

# 指定项目名与参数（非交互）
npx @xunlei-open/create-miniapp my-app -y --framework vue --variant typescript --features lint,vitest

# 使用 Biome（Vue 为实验性支持）
npx @xunlei-open/create-miniapp my-app -y --framework vue --variant typescript --features biome --no-install

# 本仓库开发调试
pnpm install
pnpm dev              # 交互式，等同发布后的 create 命令
pnpm build
node dist/index.mjs my-demo -y --framework vue --variant typescript --features lint --no-install
```

### 命令行参数

| 参数 | 说明 |
|------|------|
| `-y, --yes` | 跳过问答，使用默认或命令行参数 |
| `--framework vanilla \| vue \| react` | 框架 |
| `--variant typescript \| javascript` | 语言变体 |
| `--features lint,biome,vitest` | 可选特性（逗号分隔）；`lint` 与 `biome` 二选一 |
| `--features eslint` / `prettier` | 已合并为 `lint`，仍可作为别名传入 |
| （默认） | 交互时 features 默认全不选；`-y` 未传 `--features` 时不包含任何特性 |
| `--no-install` | 不自动安装依赖 |

## 目录结构

```text
src/
  index.ts       # Commander 入口
  prompts.ts     # 交互选型
  generator.ts   # EJS 渲染 + 拷贝
  utils.ts       # 包名、framework/variant/features 解析
  types.ts       # 类型定义
templates/
  vanilla/
  vanilla-ts/
  vue/
  vue-ts/
  react/
  react-ts/
```

## 发布

```bash
pnpm build
npm publish --access public
```

## 扩展模板

1. 在 `templates/` 下新增目录，并在 `resolveTemplateId` 的 `TEMPLATE_IDS` 中映射 framework + variant
2. 需变量替换的文件使用 `.ejs` 后缀
3. 勾选 `lint` 时需包含 `eslint.config.js.ejs`、`.prettierrc.ejs` 等
4. 勾选 `biome` 时需包含 `biome.json`、`.vscode/settings.json`，并在 `package.json.ejs` 中条件注入 `@biomejs/biome` 与 scripts

## 版本说明

- v0.1：Vanilla / Vue / React（JS/TS）；可选 Lint（ESLint+Prettier）、Biome（Vue 为 Experimental）、Vitest
