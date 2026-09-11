import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts'],
  copy: ['src/dev-client.js'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'node20',
  platform: 'node',
  deps: {
    neverBundle: [
      '@xunlei-open/miniapp-types',
      '@xunlei-open/vite-plugin-miniapp',
      'vite',
      'yazl',
    ],
  },
})
