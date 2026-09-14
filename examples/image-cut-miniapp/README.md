# 图片裁剪工具

Vanilla + TypeScript 示例，支持选择或拖入本地图片、调整裁剪区域、实时预览，并通过迅雷保存 PNG 或 JPEG 图片。图片在本地处理，无需上传或请求外部资源。

支持 JPG、PNG、WebP、BMP，可自由裁剪或选择固定比例，也可通过像素输入和方向键精确调整。页面采用响应式布局，窄屏上下排列，桌面并排展示裁剪区和设置区。

## 涉及的 API

| API | 用途 |
| --- | --- |
| `xunlei.runtime.blob.createObjectURL` | 将 Canvas 导出的图片 Blob 转换为宿主可下载的临时 URL，需要 `blob` 权限。 |
| `xunlei.tasks.create` | 使用临时 URL 创建图片下载任务，需要 `tasks.create` 权限。 |
| `xunlei.runtime.blob.revokeObjectURL` | 创建任务失败时释放临时 URL；成功后不立即撤销，避免影响下载器读取。 |

## 运行

在仓库根目录完成 `pnpm install` 和 `pnpm build` 后执行：

```bash
pnpm --filter image-cut dev
```

保持 dev server 运行，在迅雷客户端中加载 `examples/image-cut-miniapp/dist`。裁剪与预览可在浏览器中体验，通过迅雷下载需要宿主环境；下载完成前保持微应用打开。

## 检查与打包

```bash
pnpm --filter image-cut typecheck
pnpm --filter image-cut build
pnpm --filter image-cut test
pnpm --filter image-cut package
```

测试使用 Vitest 在 Node.js 中验证裁剪比例、边界限制和导出文件名，无需浏览器或预先构建。布局、拖拽、Canvas 导出和迅雷实际下载需手动验证。

ZIP 输出到本示例的 `release/`，可直接拖拽到迅雷微应用管理页面进行安装。

[返回项目首页](../../README.md)
