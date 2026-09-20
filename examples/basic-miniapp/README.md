# 基础微应用

Vanilla + TypeScript 最小示例，演示在页面中创建迅雷下载任务。

## 涉及的 API

| API                   | 用途                                                         |
| --------------------- | ------------------------------------------------------------ |
| `xunlei.tasks.create` | 通过下载地址创建普通任务，页面显示返回的任务 ID 或错误信息。 |

## 运行

在仓库根目录完成 `pnpm install` 和 `pnpm build` 后执行：

```bash
pnpm --filter basic-miniapp dev
```

保持 dev server 运行，在迅雷客户端中加载 `examples/basic-miniapp/dist`。网络访问和下载等平台能力需要迅雷宿主环境。

## 检查与打包

```bash
pnpm --filter basic-miniapp typecheck
pnpm --filter basic-miniapp package
```

ZIP 输出到本示例的 `output/`。

[返回项目首页](../../README.md)
