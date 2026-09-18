# 任务管理器

Vue + TypeScript 示例，支持创建和删除下载任务、查看任务与任务组、预览已完成的视频。

任务组会汇总子任务的视频文件，按各子任务的完成状态开放播放。删除任务或任务组时，可选择是否同时删除本地文件。

## 涉及的 API

| API | 用途 |
| --- | --- |
| `xunlei.tasks.create` | 输入下载地址，创建普通任务。 |
| `xunlei.tasks.list` | 获取最近任务的 ID 列表和总数。 |
| `xunlei.tasks.detail` | 读取状态、进度和文件；任务组通过 `children` 遍历子任务。 |
| `xunlei.tasks.delete` | 删除普通任务或任务组，通过 `deleteFiles` 选择是否删除本地文件。 |
| `xunlei.tasks.file.access` | 使用文件所属任务的 ID 和文件索引获取临时只读 URL，播放已完成的视频。 |

## 运行

在仓库根目录完成 `pnpm install` 和 `pnpm build` 后执行：

```bash
pnpm --filter task-manager-miniapp dev
```

保持 dev server 运行，在迅雷客户端中加载 `examples/task-manager-miniapp/dist`。网络访问和下载等平台能力需要迅雷宿主环境。

## 检查与打包

```bash
pnpm --filter task-manager-miniapp typecheck
pnpm exec vitest run examples/task-manager-miniapp/tests/task-files.spec.ts
pnpm --filter task-manager-miniapp package
```

ZIP 输出到本示例的 `output/`。

[返回项目首页](../../README.md)
