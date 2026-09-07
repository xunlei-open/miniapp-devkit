# 轻量任务管理示例

这个示例通过 Vue 3 + TypeScript 展示迅雷微应用的任务管理能力：

- 使用 `xunlei.tasks.create` 创建下载任务；
- 使用 `tasks.list` 和 `tasks.detail` 获取最近 20 个任务，每 1 秒轮询一次进度；
- 使用 `tasks.delete` 删除任务，示例默认保留已下载文件；
- 识别常见视频扩展名，使用 `tasks.file.access` 获取临时只读 URL，再交给 `<video>` 播放。

下载输入框默认填入迅雷官网的 MP4 示例地址，可直接创建任务并在下载完成后测试视频播放。

## 本地运行

在仓库根目录安装依赖后运行：

```bash
pnpm --filter task-manager-miniapp dev
```

保持开发服务运行，然后在迅雷客户端中加载 `examples/task-manager-miniapp`。普通浏览器中没有宿主注入的 `xunlei` 对象，因此只能查看界面，不能读取或操作真实任务。

## 打包

```bash
pnpm --filter task-manager-miniapp package
```

ZIP 会生成在 `examples/task-manager-miniapp/release/`。
