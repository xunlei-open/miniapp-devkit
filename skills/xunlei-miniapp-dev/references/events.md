# 事件脚本（按需进阶）

用于自动匹配迅雷提交的链接或介入下载生命周期。页面按钮触发的解析与下载可直接在 UI 中完成。纯事件应用可省略 `manifest.entry` 和页面文件。

## 入口与匹配

事件注册、上下文和可修改字段的完整定义见 [类型参考](api-types.ts) 中的 `XunleiEvents`、各事件 Context、`MutateTask`、`MutateOnErrorTask` 与 `MutateHttpRequest`。

默认 `src/events/onResolve.ts` 编译为 `events/onResolve.js`，清单声明的是产物路径：

```json
{
  "permissions": ["network"],
  "network": { "urls": ["https://api.example.com/*"] },
  "scripts": [
    {
      "event": "onResolve",
      "match": { "urls": ["https://example.com/item/*"] },
      "entry": "events/onResolve.js"
    }
  ]
}
```

match 控制何时运行，network.urls 控制能请求哪里，两者可以是不同域名。示例地址须替换为真实业务地址。

- 缺少 match 或匹配条件时不参与匹配。urls 数组内取或；labels 按任一 key 存在匹配；同时声明 urls 和 labels 时任一条件命中即可（OR）。
- 模式如 `https://*.example.com/item/*`，`*.example.com` 包含裸域与子域，不能写 `*example.com` 或 `www.*.com`。
- 事件支持 `<all_urls>` 全匹配、`<scheme>:*` 协议匹配（如 `magnet:*`、`ed2k:*`）和 `<scheme>://<host>/<path>` 主机／路径匹配。`<all_urls>` 不校验 URL 格式；`*://*/*` 仍要求合法非空主机，不能代替全匹配。
- `*://` 匹配任意协议，包括 WS/WSS 和自定义协议；`https://*` 可匹配任意 HTTPS 主机和路径。显式端口参与匹配，路径规则包含查询参数和锚点。避免为了让事件触发而放宽为匹配所有站点。
- `network.urls` 仅支持主机／路径规则（含 `https://*` 简写），不支持 `<all_urls>` 或 `<scheme>:*`；网络规则还需配合 `network` 权限。

## 注册与结果

在模块顶层同步调用 `xunlei.events.onResolve(...)`，异步工作放入 handler。不能在页面里注册后期待后台触发，也不能先 await 初始化再注册。

以下示例只演示把链接里的 download 参数转换为解析结果；真实项目依据业务协议实现解析器，不猜测站点 API：

```ts
xunlei.events.onResolve(async (ctx) => {
  const source = new URL(ctx.req.url)
  const value = source.searchParams.get('download')
  if (!value) return
  const target = new URL(value, source)
  if (!['http:', 'https:'].includes(target.protocol)) {
    throw new MessageError('下载地址协议不受支持')
  }
  ctx.res = {
    name: '解析结果',
    files: [
      {
        name: 'download.bin',
        req: { url: target.href },
      },
    ],
  }
})
```

上例不发起网络请求，因此单独使用时无需 network 权限。使用前面的远程接口清单时，应实现对应的接口调用并按响应校验数据。

onResolve 使用普通 Request，不暴露修改方法；首次创建的下载请求及标签在 ctx.res 中声明。给 ctx.res 赋值才会提交解析结果，不能仅 return resource。解析结果按 `OnResolveResource` / `OnResolveFileInfo` 填写：

- 资源的 `files` 必填，资源的 `name`、`size` 可省略。
- 每个文件的 `req` 必填，其中 `req.url` 必填；文件的 `name`、`path`、`size` 可省略。只知道下载地址时，文件项可仅写 `{ req: { url } }`。
- 可选字段不接受 `null`；普通任务详情中的 `Resource` / `FileInfo` 仍要求名称、路径和大小。
- 当前 `OnResolveResource` 没有 `range` 字段，不要添加；显式提供文件名与 `path` 时，要处理非法字符、Windows 保留名称及越界路径。

下载请求头填写到 `ctx.res.files[].req.extra.header`，使用字符串值；该入口跳过 `null` / `undefined`。无需处理时不赋值；匹配到但解析失败时输出明确错误。

## 生命周期能力

| 事件 | 可用操作 |
| --- | --- |
| onResolve | 读取 `ctx.req`，填写 `ctx.res` |
| onStart | 通过 `task.meta.req` 修改 URL、标签和请求头 |
| onError | 修改请求并调用 `continue()` 恢复任务 |
| onDone | 读取任务结果 |

控制方法使用 `await`，由事件声明授权；网络、blob、webview 仍需各自权限。`MessageError` 在 onResolve 中会显示用户提示。

URL 和请求头修改仅适用于 HTTP 任务。单项请求头使用 `putHeader` / `delHeader`；`setHeaders` 全量替换，遗漏项清空。名称和值转为字符串，宿主忽略名称大小写，重名取最后一项。

onStart 按单任务触发；onError / onDone 按单任务或任务组触发。组事件的 `children` 仅包含匹配当前脚本的子任务。恢复时检查子任务状态并限制重试次数；`child.continue()` 恢复该子任务，组级 `continue()` 恢复整个组。

以下示例对失败的 HTTP 任务重试一次：

```ts
xunlei.events.onError(async ({ task }) => {
  const tasks = task.type === 'group' ? task.children : [task]
  for (const child of tasks) {
    if (child.status !== 'error' || child.protocol !== 'http') continue
    const req = child.meta.req
    if (req.labels?.retry === '1') continue
    await req.putLabel('retry', '1')
    await child.continue()
  }
})
```

事件无 DOM、页面导航，也不提供 Node.js 文件系统。事件运行时与页面一样暴露完整的 `xunlei.tasks`，调用需声明对应的任务权限，缺少权限返回 `PERMISSION_DENIED`；事件上下文中的任务控制方法由事件声明授权，不受 `tasks.*` 权限控制。需要 DOM 解析时在辅助 WebView 的 execute 中执行，不直接使用 document。

每次触发创建独立运行时，完成后回收；跨触发数据放 xunlei.storage，不依赖模块缓存或常驻循环。单次事件总时限约 60 秒，给网络和等待操作设置合理超时，错误恢复有界重试。活跃 blob 数据源可延续运行时，不要创建下载数据后立即撤销 URL。

排查事件不触发时，检查产物脚本存在、注册同步完成、URL 与标签匹配、清单已重载；EVENT_TIMEOUT 查请求和等待时长，PERMISSION_DENIED 查权限，网络拦截查实际请求地址。
