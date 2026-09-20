# GitHub Release 下载

React + TypeScript 示例，解析 GitHub 最新发布的附件和源码压缩包，勾选文件后创建迅雷下载任务组。也通过 `onResolve` 钩子，在迅雷新建下载面板中解析用户输入的仓库链接。

支持 `user/repo` 短写、仓库 URL 和 `releases/latest` 地址；仅支持 github.com 的公开仓库最新版本。

以 `openai/codex` 为例，以下输入均可解析同一仓库的最新版本：

| 输入方式 | 示例                                                                                               |
| -------- | -------------------------------------------------------------------------------------------------- |
| 短写     | `openai/codex`                                                                                     |
| URL      | [https://github.com/openai/codex](https://github.com/openai/codex)                                 |
| 最新 URL | [https://github.com/openai/codex/releases/latest](https://github.com/openai/codex/releases/latest) |

## 涉及的 API

| API                        | 用途                                                 |
| -------------------------- | ---------------------------------------------------- |
| `xunlei.tasks.createGroup` | 将页面中勾选的资源一次创建为同一个下载目录的任务组。 |

## 钩子事件

用户在迅雷新建下载面板输入 GitHub 仓库链接时，希望直接看到最新 Release 的可下载文件，选择后即可创建下载任务。

通过 `onResolve` 钩子介入链接解析。在 [manifest.json](./manifest.json) 中声明匹配的链接和事件脚本：

```json
{
  "scripts": [
    {
      "event": "onResolve",
      "match": { "urls": ["https://github.com/*"] },
      "entry": "events/onResolve.js"
    }
  ]
}
```

在 [onResolve.ts](./src/events/onResolve.ts) 中解析仓库链接，通过 `ctx.res.files` 将可下载文件返回给新建下载面板。

## 运行

在仓库根目录完成 `pnpm install` 和 `pnpm build` 后执行：

```bash
pnpm --filter github-release-miniapp dev
```

保持 dev server 运行，在迅雷客户端中加载 `examples/github-release-miniapp/dist`。网络访问和下载等平台能力需要迅雷宿主环境。

## 检查与打包

```bash
pnpm --filter github-release-miniapp check
pnpm --filter github-release-miniapp test
pnpm --filter github-release-miniapp package
```

ZIP 输出到本示例的 `output/`。

[返回项目首页](../../README.md)
