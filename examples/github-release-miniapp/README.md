# GitHub Release 下载微应用

基于仓库的 React + TypeScript 脚手架创建，页面使用 React，配置使用 `@xunlei-open/miniapp-module-react`。共享解析器不依赖 React，页面与事件均可复用。

输入 `cli/cli`、`https://github.com/cli/cli` 或仓库的 `/releases/latest` 地址，解析最新 Release 的 Assets，勾选需要的文件后通过 `xunlei.tasks.createGroup` 一次创建下载任务组。组名使用仓库名（如 `cli-cli`），所选文件共享下载目录；创建失败时保留勾选，成功后清空勾选。

```bash
corepack pnpm install
corepack pnpm --filter github-release-miniapp dev
corepack pnpm --filter github-release-miniapp check
corepack pnpm --filter github-release-miniapp test
corepack pnpm --filter github-release-miniapp package
```

开发时在迅雷宿主中加载本示例的 `dist`。普通浏览器访问 GitHub HTML 会受跨域限制；本示例使用宿主提供的网络能力和 manifest 网络授权，不使用公共代理或 GitHub API。

- 页面和 `src/events/onResolve.ts` 都调用 `src/release.ts`。先 fetch `/releases/latest`，再用 Cheerio 读取 `include-fragment` 指向的 Assets HTML，提取和去重链接。Cheerio 使用不依赖浏览器 DOM 或 Node.js 网络 API 的 `cheerio/slim`。
- 包括上传的附件、源码 ZIP / tar.gz，以及 Assets 中存在的发布证明文件。默认不选择文件，文件名来自下载 URL，不使用可随意修改的链接展示名称。网页大小常为近似值，事件返回未知大小 `0`，不伪造精确字节数。
- `onResolve` 匹配 GitHub URL 后再严格检查路径，只处理仓库、`/releases`、`/releases/latest`。直接下载、源码压缩包和其他页面不会被再次解析。事件通过 `ctx.res.files` 返回全部候选文件，不调用 `xunlei.tasks`；宿主决定如何呈现文件选择。
- 仅支持 github.com 的公开仓库及 latest 发布；不支持私有仓库认证、GitHub Enterprise 或指定 tag。短路径是页面输入能力，宿主提交事件通常使用完整 HTTP URL。
- 无 Release、限流、超时、网络失败或找不到 Assets 会提示错误。GitHub HTML 结构变更可能需要调整解析器。

示例包含页面和事件两种入口。保留 `scripts`、移除 manifest 的 `entry` 即可作为纯事件微应用使用。
