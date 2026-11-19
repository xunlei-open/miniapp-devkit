# @xunlei-open/miniapp-types

迅雷微应用清单、任务 API、生命周期事件和运行时能力的 TypeScript 类型。

```bash
pnpm add -D @xunlei-open/miniapp-types
```

在 `tsconfig.json` 的 `compilerOptions.types` 中加入：

```json
{
  "compilerOptions": {
    "types": ["@xunlei-open/miniapp-types"]
  }
}
```

可获得全局 `xunlei`、`MessageError` 的类型提示，也可按需导入：

```ts
import type { MiniappManifest, OnResolveContext } from '@xunlei-open/miniapp-types'
```

本包只提供类型，运行时能力由迅雷宿主注入。API 用法见[官方文档](https://open.xunlei.com/doc/miniapp/platform-api)。

## 文件关联

页面入口通过文件后缀声明关联类型：

```json
{
  "entry": {
    "url": "index.html",
    "file_associations": [".jpg", ".jpeg", ".png", ".tar.gz"]
  }
}
```

后缀带前导点，支持复合后缀，不接受空白、路径分隔符或 `*`、`?` 通配符。
运行时将后缀转为小写并去重。未声明或空列表表示不参与文件打开方式的候选匹配，
仍可普通打开。非空列表仅支持 `miniapp` 页面入口；文件内容访问仍需相应平台权限。

## 打开参数：冷启动与再次唤起

例如，用户通过“打开方式”用微应用打开一张图片：页面尚未创建时，宿主创建页面并传入初始参数；页面已经存在时，宿主复用页面并通知新的打开参数。这两种场景分别称为**冷启动**和**再次唤起**：

| 场景                             | 微应用处理方式                                           |
| -------------------------------- | -------------------------------------------------------- |
| 冷启动：创建新页面               | 页面初始化时调用 `xunlei.runtime.getArgs()` 读取初始参数 |
| 再次唤起：已有页面再次被带参打开 | 通过 `xunlei.runtime.onNewArgs(handler)` 接收新参数      |

两种场景可以复用同一份业务处理逻辑：

```ts
import type { MiniappArgs } from '@xunlei-open/miniapp-types'

async function handleArgs(args: MiniappArgs) {
  if (args.from === 'task') {
    // 使用 args.taskId 和从 0 开始的 args.fileIndex 定位任务文件。
  }
}

// 冷启动：读取并处理当前页面的初始参数。
await handleArgs(await xunlei.runtime.getArgs())
// 再次唤起：处理已有页面后续收到的打开参数。
const unsubscribe = await xunlei.runtime.onNewArgs(handleArgs)
// 页面业务不再接收参数时调用 unsubscribe()。
```

普通打开页面时，初始参数为 `{}`；从任务文件打开时，参数包含 `from: 'task'`、`taskId` 和 `fileIndex`。

`getArgs()` 始终返回当前页面的初始参数，后续带参打开不会覆盖它。`onNewArgs` 不回放初始参数，只通知已有页面再次被带参打开的情况；普通无参唤起或仅切回页面不会触发通知，因此它不能用作通用的页面显示或恢复事件。
