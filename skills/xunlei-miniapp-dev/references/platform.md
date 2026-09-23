# 平台 API

完整签名见 [类型参考](api-types.ts) 中的 `Xunlei`。以下说明权限与运行行为。

## 页面创建任务

```ts
async function createDownload(url: string) {
  if (typeof xunlei === 'undefined') {
    throw new Error('请在迅雷中使用下载功能')
  }
  const value = url.trim()
  if (!value) throw new Error('请输入下载地址')
  const task = await xunlei.tasks.create({ req: { url: value } })
  xunlei.logger.info('任务已创建', task.id)
  return task
}
```

下载请求头填写在 `req.extra.header`（单数），使用字符串值。按业务需要支持 HTTP(S)、磁力和本地种子，避免使用仅接受 HTTP 的校验逻辑排除其他下载协议。

## 权限与接口

| 能力                                              | 权限                | 关键行为                                                         |
| ------------------------------------------------- | ------------------- | ---------------------------------------------------------------- |
| `tasks.create({ req, opts? })`                    | `tasks.create`      | 返回单任务                                                       |
| `tasks.createGroup({ name, tasks, opts? })`       | `tasks.create`      | 共享下载目录；name 是单个目录名；tasks 中每项为 `{ req, opts? }` |
| `tasks.list({ offset?, limit?, status?, sort? })` | `tasks.list`        | 返回 `{ ids, total }`，不是任务数组                              |
| `tasks.detail({ id })`                            | `tasks.detail`      | 返回 `Task \| TaskGroup`                                         |
| `tasks.update({ id, req: { labels } })`           | `tasks.update`      | 当前只支持更新标签                                               |
| `tasks.delete({ id, deleteFiles? })`              | `tasks.delete`      | deleteFiles 默认 false                                           |
| `tasks.file.access({ taskId, fileIndex })`        | `tasks.file.access` | 返回只读临时 URL                                                 |
| `runtime.blob.*`                                  | `blob`              | 用于下载时还需 tasks.create                                      |
| `runtime.webview.*`                               | `webview`           | 未声明时 isAvailable 返回 false                                  |
| `host.env.*`                                      | 无                  | 页面和事件脚本均可用                                             |
| `host.ui.*`                                       | 无                  | 仅页面可用，事件脚本不注入                                       |
| 直接网络请求                                      | `network`           | 同时需要 network.urls 匹配                                       |
| storage / settings / info / logger / 事件注册     | 无                  | 仍受所在运行环境限制                                             |

权限逐项声明，不支持 `tasks` 或 `tasks.*` 通配。异步宿主 API 使用 await；`info`、`settings` 读取与 `logger.*` 同步。平台错误按 `{ code, message, details }` 处理，权限错误先查声明和是否重新加载清单。

页面与事件运行时均暴露完整的 `xunlei.tasks`；缺少对应权限时调用返回 `PERMISSION_DENIED`，不会移除 API。

### 任务操作

- `tasks.update` 仅支持更新 `req.labels`。
- 按 `detail.type` 区分任务：单任务读取 `meta`、`protocol`，任务组读取 `children`。
- 页面维护分页参数 `offset` / `limit`。
- `deleteFiles` 仅用于明确要求同时删除文件的功能，不默认打开。文件访问 URL 即取即用，不持久化。

## 网络与静态资源

开发资源加载和主页面与辅助 WebView 的跨域差异见 [运行环境与构建选择](runtime.md)。

直接请求远程接口时合并所需权限和规则，不覆盖已有配置：

```json
{
  "permissions": ["tasks.create", "network"],
  "network": { "urls": ["https://api.example.com/*"] }
}
```

只声明实际请求范围。`network.urls` 支持 `<scheme>://<host>/<path>` 及省略路径的写法，如 `https://*`；`*://` 覆盖任意协议，包括 WS/WSS。`<all_urls>` 和 `<scheme>:*` 仅用于事件匹配，不会授予网络访问权限。仅声明 network 权限或 URL 规则、规则为空或无效、请求未命中时，直接网络请求均被拒绝。任务下载地址、辅助 WebView 不受该白名单约束，不要仅因下载域名就增加 network。

静态 JS、CSS、字体、图片、媒体随包构建，不能用远程 CDN 或 iframe 绕过限制。动态图片可在允许的数据请求后转成浏览器 Blob URL 展示并及时释放，但这不会启用浏览器原生下载。

## 存储和设置

`await storage.get(key)` 得到字符串，缺失时为 `''`；对象自行 JSON 序列化。`settings` 是按 `manifest.settings[].name` 注入的只读快照，未配置时可能为 `undefined`；设置 UI 由宿主生成，赋值不能更新持久化设置。

## 宿主环境与 UI

`host.env` 查询宿主默认下载目录，页面和事件脚本均可用；`host.ui` 操作宿主界面，仅页面可用。两者均无权限要求。用户修改下载目录后，后续查询返回新值，不要缓存当常量。深浅主题通过媒体查询自动跟随宿主，见 [主题适配](responsive-ui.md#主题适配)。

```ts
// 选目录、建任务、跳转高亮。
const dir = await xunlei.host.env.defaultDownloadDir()
const picked = await xunlei.host.ui.pickDirectory({ defaultPath: dir })
const task = await xunlei.tasks.create({
  req: { url },
  opts: { path: picked?.path ?? dir },
})
await xunlei.host.ui.openTaskList({ taskId: task.id })
```

`pickDirectory` 用户取消时返回 `null`，不抛错，不要用 try/catch 区分取消；错误处理只留给真错误。`openTaskList` 的 `taskId` 不存在或列表中不可见时仅跳转、不高亮，不报错。

## 导出 Blob

```ts
const data = new Blob(['示例内容'], { type: 'text/plain;charset=utf-8' })
const url = await xunlei.runtime.blob.createObjectURL(data)
await xunlei.tasks.create({ req: { url }, opts: { name: 'export.txt' } })
```

不要在 tasks.create 返回后立即 revoke，下载器可能尚未读取。URL 不持久化，运行环境销毁、停用或空闲可能回收。大文件按需用 opener；每次调用返回新的流，开启 Range 时提供总大小并正确处理区间。

## 辅助 WebView

动态页面提取或用户登录时使用；普通数据接口优先 fetch。页面中需要用户交互时 headless 为 false；非本地开发环境中，事件脚本打开的 WebView 会被强制隐藏，不依赖它完成交互式登录。辅助 WebView 用于页面数据提取或登录等辅助流程，微应用本身仍使用包内 UI 页面入口。

```ts
async function readPageTitle(url: string) {
  if (!(await xunlei.runtime.webview.isAvailable())) {
    throw new Error('辅助 WebView 不可用，请检查权限和客户端支持')
  }
  const page = await xunlei.runtime.webview.open({ headless: true })
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeoutMs: 10_000 })
    if (!(await page.waitForSelector('title', { timeoutMs: 5_000 }))) {
      throw new Error('等待页面超时')
    }
    return await page.execute<string>(() => document.title)
  } finally {
    await page.close()
  }
}
```

execute 函数在目标页面执行，不依赖外部闭包，所需参数显式传入。目标页面没有 xunlei，Cookie 与微应用页面隔离。waitForSelector 超时返回 false，waitForFunction 超时返回 null，必须检查结果；用完主动关闭。
