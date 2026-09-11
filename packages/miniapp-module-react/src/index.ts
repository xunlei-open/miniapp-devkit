import react from '@vitejs/plugin-react'
import type { MiniappModule } from '@xunlei-open/miniapp'

export default {
  name: '@xunlei-open/miniapp-module-react',
  vite: () => ({ plugins: [react()] }),
} satisfies MiniappModule
