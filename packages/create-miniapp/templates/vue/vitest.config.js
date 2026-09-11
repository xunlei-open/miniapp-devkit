import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import { loadMiniappConfig } from '@xunlei-open/miniapp'

export default defineConfig(async () => {
  const config = await loadMiniappConfig(fileURLToPath(new URL('.', import.meta.url)), {
    command: 'serve',
    mode: 'test',
  })
  return config.vite
})
