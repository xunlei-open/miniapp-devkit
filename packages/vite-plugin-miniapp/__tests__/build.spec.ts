import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, test } from 'vitest'
import { build } from 'vite'
import miniapp from '../src/index'

const temporaryDirectories: string[] = []

afterEach(async () => {
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

test('reports a missing events directory', async () => {
  const root = await mkdtemp(join(tmpdir(), 'vite-plugin-miniapp-'))
  temporaryDirectories.push(root)

  await writeFile(join(root, 'index.html'), '<!doctype html>')
  await writeFile(join(root, 'manifest.json'), '{}')

  await expect(
    build({ root, logLevel: 'silent', plugins: [miniapp()] }),
  ).rejects.toThrow('[vite-plugin-miniapp] events dir not found')
})
