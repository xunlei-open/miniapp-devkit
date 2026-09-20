# 事件脚本（按需进阶）

用于自动匹配迅雷提交的链接或介入下载生命周期。页面按钮触发的解析与下载可直接在 UI 中完成。纯事件应用可省略 `manifest.entry` 和页面文件。

## 入口与匹配

事件注册、上下文和可修改字段的完整定义见 [类型参考](api-types.ts) 中的 `XunleiEvents`、各事件 Context、`ExtensionTask` 与 `OnErrorExtensionTask`。

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

- 缺少 match 或匹配条件时不参与匹配。urls 数组内取或；labels 按任一 key 存在匹配；同时声明 urls 和 labels 时两者都需命中。
- 模式如 `https://*.example.com/item/*`，`*.example.com` 包含裸域与子域，不能写 `*example.com` 或 `www.*.com`。
- `*://` 只匹配 HTTP(S)；端口不参与匹配；`/item/*` 也命中 `/item`。避免为了让事件触发而放宽为匹配所有站点。

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

ctx.req 只读；给 ctx.res 赋值才会提交结果，不能仅 return resource。解析结果按 `OnResolveResource` / `OnResolveFileInfo` 填写：

- 资源的 `files` 必填，资源的 `name`、`size` 可省略。
- 每个文件的 `req` 必填，其中 `req.url` 必填；文件的 `name`、`path`、`size` 可省略。只知道下载地址时，文件项可仅写 `{ req: { url } }`。
- 可选字段不接受 `null`；普通任务详情中的 `Resource` / `FileInfo` 仍要求名称、路径和大小。
- 当前 `OnResolveResource` 没有 `range` 字段，不要添加；显式提供文件名与 `path` 时，要处理非法字符、Windows 保留名称及越界路径。

无需处理时不赋值；匹配到但解析失败时输出明确错误。

## 生命周期能力

| 事件      | 可用操作                                                           |
| --------- | ------------------------------------------------------------------ |
| onResolve | 读 ctx.req，给 ctx.res 赋值                                        |
| onStart   | ctx.task.setUrl；ctx.task.meta.req.setLabels / putLabel / delLabel |
| onError   | 开始事件的控制能力，另有只读 ctx.error 和 ctx.task.continue()      |
| onDone    | ctx.task 只读，没有任务控制方法                                    |

控制方法返回 Promise。上下文控制由事件声明授权，不需要额外 tasks 权限；网络、blob、webview 仍要各自权限。MessageError 仅在 onResolve 中有用户 toast 的特殊语义，其它运行位置自行处理用户反馈。

事件无 DOM、页面导航，也不提供 Node.js 文件系统。事件中的 `xunlei.tasks` 可用能力以目标宿主版本为准。需要 DOM 解析时在辅助 WebView 的 execute 中执行，不直接使用 document。

每次触发创建独立运行时，完成后回收；跨触发数据放 xunlei.storage，不依赖模块缓存或常驻循环。单次事件总时限约 60 秒，给网络和等待操作设置合理超时，错误恢复有界重试。活跃 blob 数据源可延续运行时，不要创建下载数据后立即撤销 URL。

排查事件不触发时，检查产物脚本存在、注册同步完成、URL 与标签匹配、清单已重载；EVENT_TIMEOUT 查请求和等待时长，PERMISSION_DENIED 查权限，网络拦截查实际请求地址。
