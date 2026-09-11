import vue from '@vitejs/plugin-vue'
import type { MiniappModule } from '@xunlei-open/miniapp'

export default {
  name: '@xunlei-open/miniapp-module-vue',
  vite: () => ({ plugins: [vue()] }),
} satisfies MiniappModule
