# Contributing

感谢参与 Xunlei Miniapp Devkit。

## 本地开发

```bash
git clone https://github.com/xunlei-open/miniapp-devkit.git
cd miniapp-devkit
pnpm install
pnpm verify
```

请将功能修改放在对应 workspace 中，并同步补充测试和 README。提交 Pull Request 前确保 `pnpm verify` 完整通过。

## 修改脚手架

模板位于 `packages/create-miniapp/templates`。修改模板后，至少运行脚手架测试，并生成一个项目做构建验证：

```bash
pnpm --filter @xunlei-open/create-miniapp test
pnpm --filter @xunlei-open/create-miniapp build
node packages/create-miniapp/dist/index.mjs demo -y --no-install
```
