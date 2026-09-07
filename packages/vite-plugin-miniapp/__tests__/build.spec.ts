import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, test, vi } from 'vitest'
import { build } from 'vite'
import miniapp from '../src/index'

const temporaryDirectories: string[] = []

afterEach(async () => {
  vi.restoreAllMocks()
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  )
})

test('builds event entries and copies manifest assets', async () => {
  const root = await mkdtemp(join(tmpdir(), 'vite-plugin-miniapp-'))
  temporaryDirectories.push(root)

  await writeFile(
    join(root, 'index.html'),
    '<!doctype html><script type="module" src="/src/main.ts"></script>',
  )
  await writeFile(join(root, 'icon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>')
  await writeFile(
    join(root, 'manifest.json'),
    JSON.stringify({ name: 'test', title: 'Test', version: '1.0.0', icon: 'icon.svg' }),
  )

  const sourceDirectory = join(root, 'src')
  const eventsDirectory = join(sourceDirectory, 'events')
  await mkdir(eventsDirectory, { recursive: true })
  await writeFile(join(sourceDirectory, 'main.ts'), 'document.body.dataset.ready = "true"')
  await writeFile(join(eventsDirectory, 'onResolve.ts'), 'globalThis.__eventBuilt = true')

  await build({
    root,
    logLevel: 'silent',
    plugins: [miniapp()],
  })

  expect(existsSync(join(root, 'dist/index.html'))).toBe(true)
  expect(existsSync(join(root, 'dist/events/onResolve.js'))).toBe(true)
  expect(existsSync(join(root, 'dist/icon.svg'))).toBe(true)
  expect(JSON.parse(await readFile(join(root, 'dist/manifest.json'), 'utf8'))).toMatchObject({
    name: 'test',
    icon: 'icon.svg',
  })
})

test('builds a page-only miniapp without an events directory', async () => {
  const root = await mkdtemp(join(tmpdir(), 'vite-plugin-miniapp-'))
  temporaryDirectories.push(root)

  await writeFile(join(root, 'index.html'), '<!doctype html>')
  await writeFile(join(root, 'manifest.json'), '{}')

  await build({ root, logLevel: 'silent', plugins: [miniapp()] })

  expect(existsSync(join(root, 'dist/index.html'))).toBe(true)
  expect(existsSync(join(root, 'dist/manifest.json'))).toBe(true)
  expect(existsSync(join(root, 'dist/events'))).toBe(false)
})

test('does not copy manifest assets from outside the project', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  const parent = await mkdtemp(join(tmpdir(), 'vite-plugin-miniapp-parent-'))
  temporaryDirectories.push(parent)
  const root = join(parent, 'project')
  await mkdir(root)
  await Promise.all([
    writeFile(join(root, 'index.html'), '<!doctype html><title>Miniapp</title>'),
    writeFile(join(parent, 'outside.png'), 'outside'),
    writeFile(
      join(root, 'manifest.json'),
      JSON.stringify({
        name: 'test',
        title: 'Test',
        version: '1.0.0',
        icon: '../outside.png',
      }),
    ),
  ])

  await build({ root, logLevel: 'silent', plugins: [miniapp()] })

  expect(existsSync(join(root, 'outside.png'))).toBe(false)
  expect(existsSync(join(root, 'dist/outside.png'))).toBe(false)
  expect(warn).toHaveBeenCalledWith(
    '[vite-plugin-miniapp] static asset is outside project root: ../outside.png',
  )
})
