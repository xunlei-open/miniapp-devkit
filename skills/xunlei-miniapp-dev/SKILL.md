---
name: xunlei-miniapp-dev
description: 使用 miniapp-devkit 创建、开发、调试和打包迅雷客户端微应用，接入 xunlei API 或下载事件。
---

# 迅雷微应用开发

迅雷微应用是由客户端 WebView 加载的轻量 Web 应用，包内包含 `manifest.json`、页面与静态资源，通过宿主注入的 `xunlei` 调用平台能力。

默认开发带 UI 的包内 `index.html` 页面；需要介入下载生命周期时添加对应事件，用户明确要求纯事件应用时可省略页面。新工程使用官方脚手架，已有工程沿用其技术栈与约定。

## 参考文档

- 创建工程、配置、调试、打包与安装：[工程与交付](references/project.md)。
- 配置资源加载、Worker/WASM 或判断主页面与辅助页面差异：[运行环境与构建选择](references/runtime.md)。
- 编写或调整 UI：[响应式布局](references/responsive-ui.md)，包含默认 900 × 700、无应用级 Header 和一屏布局约定。
- 下载任务、存储、网络、Blob、辅助 WebView：[平台 API](references/platform.md)。
- 读取宿主主题、下载目录或调用宿主 UI：[宿主环境与 UI](references/platform.md#宿主环境与-ui)。
- 自动解析链接或处理下载生命周期：[事件脚本](references/events.md)。
- 查询字段与签名：[完整类型参考](references/api-types.ts)。清单从 `MiniappManifest`、平台 API 从 `Xunlei`、事件从 `XunleiEvents` 及对应 Context 定位。

只读取任务涉及的参考。类型参考随 Skill 分发，无需先安装依赖；已有工程以其依赖版本为准。类型未说明的运行行为查客户端开发文档或在目标客户端验证。

## 平台约束

- `xunlei` 是全局对象，类型包无需运行时 import。
- 页面依赖与静态资源随包构建。容器限制远程资源加载、iframe、外部跳转和 `window.open`；`network` 权限仅用于允许的数据请求。开发模式的本机资源例外见运行环境说明，不套用为生产能力。
- 应用内导航使用单一页面的 Hash 路由，配置见 [应用内路由](references/project.md#应用内路由)。
- 下载使用 `xunlei.tasks.create`；内存数据经 `xunlei.runtime.blob.createObjectURL` 转为任务地址，不使用浏览器原生下载。

## 最佳实践

- **构建配置**：优先使用 devkit 默认配置和 Vite 原生能力；业务需求或具体兼容问题需要时再增加自定义适配。
- **持久化设置**：优先考虑在应用内开发设置 UI，并通过 `xunlei.storage` 读写持久化数据。`manifest.settings` 声明式配置一般用于用户不想开发设置 UI，或需求简单且用户明确指定使用的场景；具体 API 行为见 [存储和设置](references/platform.md#存储和设置)。
- **数据获取**：普通数据接口优先使用 `fetch`；需要目标站点页面状态、登录或执行网页脚本时再使用辅助 WebView，并在结束后关闭，见 [辅助 WebView](references/platform.md#辅助-webview)。
- **图片展示**：远程图片通过允许的 `fetch` 请求转为 Blob，再用浏览器 `URL.createObjectURL` 生成 `<img src>`，不再使用时调用 `URL.revokeObjectURL` 释放，见 [网络与静态资源](references/platform.md#网络与静态资源)。

## 完成与交付

创建应用时完成核心功能、相关检查和可加载的产物：开发调试使用 `dist/`，生产构建使用 `output/`，ZIP 默认输出到 `output/`；已有工程以其 devkit 版本与配置为准，修改按影响范围验证。构建和打包不自动做类型检查，浏览器预览也不能替代宿主验证。

交付说明功能、实际产物路径、已执行检查及待做的宿主验证；提供 [本地加载与 ZIP 安装](references/project.md#安装体验指引) 两种体验方式。没有支持微应用的 Windows 迅雷客户端时，明确说明未完成宿主联调。
