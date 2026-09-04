import miniapp from '@xunlei-open/vite-plugin-miniapp'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [miniapp()],
  build: {
    target: 'es2022',
  },
})
