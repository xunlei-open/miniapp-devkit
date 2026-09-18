import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, test } from 'vitest'
import { loadMiniappConfig } from '../src/config.js'

const directories: string[] = []

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  )
})

async function createRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'miniapp-config-'))
  directories.push(root)
  return root
}

test('loads miniapp config and resolves its nested Vite config', async () => {
  const root = await createRoot()
  await writeFile(
    join(root, 'miniapp.config.ts'),
    `export default {
      manifest: 'app.json',
      events: { dir: 'events', extensions: ['.mts'] },
      package: { outDir: 'artifacts', fileName: 'app.zip' },
      vite: ({ mode }) => ({ define: { __MODE__: JSON.stringify(mode) } }),
    }`,
  )

  const config = await loadMiniappConfig(root, {
    command: 'build',
    mode: 'testing',
    isSsrBuild: false,
    isPreview: false,
  })

  expect(config.manifestFile).toBe('app.json')
  expect(config.eventsDir).toBe('events')
  expect(config.eventsExtensions).toEqual(['.mts'])
  expect(config.packageOutDir).toBe('artifacts')
  expect(config.packageFileName).toBe('app.zip')
  expect(config.vite.define).toEqual({ __MODE__: JSON.stringify('testing') })
})

test('requires exactly one miniapp config file', async () => {
  const missingRoot = await createRoot()
  await expect(
    loadMiniappConfig(missingRoot, {
      command: 'serve',
      mode: 'development',
      isSsrBuild: false,
      isPreview: false,
    }),
  ).rejects.toThrow('No miniapp.config file found')

  const duplicateRoot = await createRoot()
  await Promise.all([
    writeFile(join(duplicateRoot, 'miniapp.config.ts'), 'export default {}'),
    writeFile(join(duplicateRoot, 'miniapp.config.js'), 'export default {}'),
  ])
  await expect(
    loadMiniappConfig(duplicateRoot, {
      command: 'serve',
      mode: 'development',
      isSsrBuild: false,
      isPreview: false,
    }),
  ).rejects.toThrow('Multiple miniapp config files found')
})

test('keeps custom development and production output configuration independent', async () => {
  const root = await createRoot()
  await writeFile(join(root, 'miniapp.config.mjs'), `export default {
    dev: { outDir: 'local-dev' },
    vite: { build: { outDir: 'artifacts/app' } },
  }`)
  for (const command of ['serve', 'build'] as const) {
    const config = await loadMiniappConfig(root, { command, mode: 'development' })
    expect(config.devOutDir).toBe('local-dev')
    expect(config.vite.build?.outDir).toBe('artifacts/app')
    expect(config.packageOutDir).toBe('output')
  }
})

test.each(['dist', 'dist/production', '.'])('rejects a build output overlapping the dev directory: %s', async outDir => {
  const root = await createRoot()
  await writeFile(join(root, 'miniapp.config.mjs'), `export default { vite: { build: { outDir: ${JSON.stringify(outDir)} } } }`)
  await expect(loadMiniappConfig(root, { command: 'build', mode: 'production' })).rejects.toThrow('must be separate directories')
})

test('resolves modules from the project and lets user config override module defaults', async () => {
  const root = await createRoot()
  const moduleDir = join(root, 'node_modules/test-miniapp-module')
  await mkdir(moduleDir, { recursive: true })
  await writeFile(join(moduleDir, 'package.json'), JSON.stringify({ name: 'test-miniapp-module', type: 'module', exports: './index.mjs' }))
  await writeFile(join(moduleDir, 'index.mjs'), `export default {
    name: 'test-miniapp-module',
    vite: async ({ mode }) => ({
      plugins: [{ name: 'framework-plugin' }],
      define: { MODULE_MODE: JSON.stringify(mode) },
      build: { target: 'es2020' },
    }),
  }`)
  await writeFile(join(root, 'miniapp.config.mjs'), `export default {
    modules: ['test-miniapp-module', 'test-miniapp-module'],
    vite: { plugins: [{ name: 'project-plugin' }], build: { target: 'es2022' } },
  }`)
  const config = await loadMiniappConfig(root, { command: 'build', mode: 'testing' })
  expect(config.vite.plugins).toEqual([{ name: 'framework-plugin' }, { name: 'project-plugin' }])
  expect(config.vite.define).toEqual({ MODULE_MODE: '"testing"' })
  expect(config.vite.build?.target).toBe('es2022')
})

test('reports the module name when a configured module cannot be loaded', async () => {
  const root = await createRoot()
  await writeFile(join(root, 'miniapp.config.mjs'), `export default { modules: ['missing-miniapp-module'] }`)
  await expect(loadMiniappConfig(root, { command: 'serve', mode: 'development' })).rejects.toThrow('Failed to load miniapp module "missing-miniapp-module"')
})
