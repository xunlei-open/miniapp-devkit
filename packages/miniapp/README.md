# @xunlei-open/miniapp

迅雷微应用统一开发工具，内部复用 Vite，提供开发、构建、校验和打包命令。

```bash
pnpm add -D @xunlei-open/miniapp
```

```json
{
  "scripts": {
    "dev": "xunlei-miniapp",
    "build": "xunlei-miniapp build",
    "package": "xunlei-miniapp package"
  }
}
```

项目使用 `miniapp.config.ts` 作为唯一工具配置：

```ts
import { defineConfig } from '@xunlei-open/miniapp'

export default defineConfig({
  vite: {
    build: {
      target: 'es2015',
    },
  },
})
```

框架插件、alias、CSS、开发服务器等 Vite 配置均写在 `vite` 字段中。`manifest.json` 继续作为迅雷运行时读取的应用清单。

## 命令

Vue/React 项目可安装 `@xunlei-open/miniapp-module-vue` / `@xunlei-open/miniapp-module-react`，并在配置中声明 `modules: ['@xunlei-open/miniapp-module-vue']`。模块从项目依赖中解析，按声明顺序合并 Vite 配置，最后合并项目的 `vite` 配置，无需再次注册框架插件。Vanilla 项目无需模块。

自定义模块默认导出 `defineMiniappModule({ name, vite })`，其中 `vite` 支持配置对象或接收 Vite `ConfigEnv` 的异步函数。`defineMiniappModule` 从 `@xunlei-open/miniapp` 导入。

dev、build 和 package 均不默认执行类型检查。TS 模板提供可选的 `typecheck` 脚本，供手动执行或 CI 使用。

支持纯页面、纯事件、页面与事件并存三种形态。纯事件微应用只需声明 manifest 的 `scripts`，不声明 `entry`，也不需要 `index.html` 或框架模块。dev 会编译并监听事件脚本、同步 manifest 和图标，不启动页面 HTTP 服务；build 和 package 同样无需页面文件。

开发时加载终端提示的 `dist` 目录（或 `vite.build.outDir`）。CLI 将经过 Vite 和框架插件转换的 HTML 写入该目录，并复制 manifest 和图标。本地 HTML 通过绝对 URL 从开发服务器加载模块、资源和 HMR 客户端，因此需要保持 dev 服务运行。Vue/React 的模块热更新无需整页刷新；HTML 入口修改会重新生成本地入口并刷新页面。

dev 也会将 `src/events`（或配置的 `events.dir`）中的事件脚本编译到 `dist/events`，监听脚本及其导入依赖的修改，并处理入口新增、删除。事件构建不会覆盖页面的 HMR 入口；manifest 声明的脚本缺少对应源码时，启动会报错。事件编译失败会保留上一次成功编译的产物并输出错误，修复后自动重试。

只有 manifest 的 `icon` 字段声明的应用图标会复制到开发目录，修改、删除或重新创建图标文件也会同步。事件沙箱和宿主应用图标不使用页面 HMR：如果宿主缓存脚本或图标，需在宿主中重新加载应用。修改 manifest 的入口、脚本声明或图标路径仍需重启 dev。

默认允许本地文件的 `null` origin 访问开发资源。如果宿主使用自己的协议并发送其他 Origin，可通过 `vite.server.cors.origin` 配置该来源；宿主也需要允许访问本机开发服务器及其 WebSocket。开发入口使用绝对资源地址，不注入 `<base>`，兼容 `base-uri 'none'`。修改 manifest 后重启 dev 并重新加载应用。发布前运行 build 生成生产产物。

```bash
xunlei-miniapp                 # 启动开发服务
xunlei-miniapp build           # 构建并校验 dist
xunlei-miniapp package         # 构建、校验并生成 ZIP
xunlei-miniapp package --no-build
xunlei-miniapp validate         # 校验当前配置对应的构建目录
```
