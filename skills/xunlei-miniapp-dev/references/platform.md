# 平台 API

API 以目标版本 devkit 类型与实现为准。下面按本仓库当前类型整理，使用新版本时复核签名；旧文档片段不得覆盖 devkit 定义。

## 页面创建任务

将返回值与错误接入现有 UI，执行期间避免重复提交：

```ts
async function createDownload(url: string) {
  if (typeof xunlei === 'undefined') {
    throw new Error('请在迅雷中使用下载功能');
  }
  const value = url.trim();
  if (!value) throw new Error('请输入下载地址');
  const task = await xunlei.tasks.create({ req: { url: value } });
  xunlei.logger.info('任务已创建', task.id);
  return task;
}
```

任务请求放在 `req`，下载选项放在 `opts`。当前 Request.extra 只支持 header，不添加 method / body；HttpHeader 支持 User-Agent、Referer、Cookie、Authorization。HTTP 下载请求头使用 `req.extra.header`（单数），不同于 `fetch` 的 `headers`。按功能范围支持 HTTP(S)、磁力和本地种子，不用仅支持 HTTP 的验证器无意排除业务所需协议。

## 权限与接口

| 能力 | 权限 | 关键行为 |
| --- | --- | --- |
| `tasks.create({ req, opts? })` | `tasks.create` | 返回单任务 |
| `tasks.createGroup({ name, reqs, opts? })` | `tasks.create` | 共享下载目录；name 是单个目录名 |
| `tasks.list({ offset?, limit?, status?, sort? })` | `tasks.list` | 返回 `{ ids, total }`，不是任务数组 |
| `tasks.detail({ id })` | `tasks.detail` | 返回 `Task \| TaskGroup` |
| `tasks.update({ id, req: { labels } })` | `tasks.update` | 当前只支持更新标签 |
| `tasks.delete({ id, deleteFiles? })` | `tasks.delete` | deleteFiles 默认 false |
| `tasks.file.access({ taskId, fileIndex })` | `tasks.file.access` | 返回只读临时 URL |
| `runtime.blob.*` | `blob` | 用于下载时还需 tasks.create |
| `runtime.webview.*` | `webview` | 未声明时 isAvailable 返回 false |
| 直接网络请求 | `network` | 同时需要 network.urls 匹配 |
| storage / settings / info / logger / 事件注册 | 无 | 仍受所在运行环境限制 |

权限逐项声明，不支持 `tasks` 或 `tasks.*` 通配。异步宿主 API 使用 await；`info`、`settings` 读取与 `logger.*` 同步。平台错误按 `{ code, message, details }` 处理，权限错误先查声明和是否重新加载清单。

### 容易误用的任务行为

- `tasks.update` 不支持 `opts.name`、`req.url` 或暂停恢复，只使用当前 `TaskUpdateInput` 支持的 `req.labels`。事件改地址用 `ctx.task.setUrl`，不要据此推导页面改地址能力。
- `detail.type === 'single'` 后才能读取 `meta`、`protocol`；任务组读取 `children`，不能假定每条详情都为普通任务。
- 分页参数由页面保管，不依赖 `list` 返回 `offset` / `limit`。
- 轮询详情时防止请求重叠、卸载时停止，并处理某个任务已删除的情况。不要发明暂停、恢复或订阅进度的 API。
- `deleteFiles` 仅用于明确要求同时删除文件的功能，不默认打开。文件访问 URL 即取即用，不持久化。

## 网络与静态资源

直接请求远程接口时合并所需权限和规则，不覆盖已有配置：

```json
{
  "permissions": ["tasks.create", "network"],
  "network": { "urls": ["https://api.example.com/*"] }
}
```

只声明实际请求范围。`*://` 只覆盖 HTTP(S)，WebSocket 显式写 `ws://` 或 `wss://`。任务下载地址、辅助 WebView 不受该白名单约束，不要仅因下载域名就增加 network。

静态 JS、CSS、字体、图片、媒体随包构建，不能用远程 CDN 或 iframe 绕过限制。动态图片可在允许的数据请求后转成浏览器 Blob URL 展示并及时释放，但这不会启用浏览器原生下载。

## 存储和设置

`storage.get(key)` 返回字符串，缺失时为 `''`；对象自行 JSON 序列化并处理损坏数据。`settings` 是按 `manifest.settings[].name` 注入的只读快照，设置 UI 由宿主生成，赋值不能更新持久化设置。凭据不写日志或提交源码。

## 导出 Blob

```ts
const data = new Blob(['示例内容'], { type: 'text/plain;charset=utf-8' });
const url = await xunlei.runtime.blob.createObjectURL(data);
await xunlei.tasks.create({ req: { url }, opts: { name: 'export.txt' } });
```

不要在 tasks.create 返回后立即 revoke，下载器可能尚未读取。URL 不持久化，运行环境销毁、停用或空闲可能回收。大文件按需用 opener；每次调用返回新的流，开启 Range 时提供总大小并正确处理区间。

## 辅助 WebView

动态页面提取或用户登录时使用；普通数据接口优先 fetch。需要用户交互时 headless 为 false。辅助 WebView 用于页面数据提取或登录等辅助流程，微应用本身仍使用包内 UI 页面入口。

```ts
async function readPageTitle(url: string) {
  if (!(await xunlei.runtime.webview.isAvailable())) {
    throw new Error('辅助 WebView 不可用，请检查权限和客户端支持');
  }
  const page = await xunlei.runtime.webview.open({ headless: true });
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeoutMs: 10_000 });
    if (!(await page.waitForSelector('title', { timeoutMs: 5_000 }))) {
      throw new Error('等待页面超时');
    }
    return await page.execute<string>(() => document.title);
  } finally {
    await page.close();
  }
}
```

execute 函数在目标页面执行，不依赖外部闭包，所需参数显式传入。目标页面没有 xunlei，Cookie 与微应用页面隔离。waitForSelector 超时返回 false，waitForFunction 超时返回 null，必须检查结果；用完主动关闭。
