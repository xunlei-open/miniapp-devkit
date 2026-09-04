# Basic Miniapp

这个示例直接引用 monorepo 内的类型包和 Vite 插件，展示：

- 使用 `xunlei.tasks.create` 创建下载任务；
- 使用类型安全的 `onResolve` 生命周期事件；
- 将页面、事件、manifest 和图标构建到同一个 `dist` 目录。

在仓库根目录运行：

```bash
pnpm dev
```

普通浏览器预览不会注入 `xunlei`，页面会给出提示；实际 API 需在迅雷微应用宿主中运行。
