import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, test } from 'vitest'
import { packageMiniapp } from '../src/package.js'
import { validateMiniappDirectory } from '../src/validate.js'
import { buildMiniapp } from '../src/vite.js'

const directories: string[] = []

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  )
})

async function createProject(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'miniapp-workflow-'))
  directories.push(root)
  await Promise.all([
    writeFile(
      join(root, 'miniapp.config.ts'),
      `export default {
        package: { outDir: 'artifacts' },
        vite: { build: { outDir: 'output', target: 'es2022' } },
      }`,
    ),
    writeFile(
      join(root, 'manifest.json'),
      JSON.stringify({
        manifest_version: 1,
        name: 'test-miniapp',
        title: 'Test Miniapp',
        version: '1.2.3',
        icon: 'icon.png',
        entry: { type: 'miniapp', url: 'index.html' },
      }),
    ),
    writeFile(
      join(root, 'index.html'),
      '<!doctype html><html><body><script type="module" src="/src.ts"></script></body></html>',
    ),
    writeFile(join(root, 'src.ts'), 'document.body.dataset.ready = "true"'),
    writeFile(join(root, 'icon.png'), 'icon'),
  ])
  return root
}

test('builds with nested Vite config and validates the output', async () => {
  const root = await createProject()
  const result = await buildMiniapp({ root })

  expect(result.outDir).toBe(join(root, 'output'))
  const validation = await validateMiniappDirectory(result.outDir)
  expect(validation.files).toContain('manifest.json')
  expect(validation.files).toContain('index.html')
  expect(validation.files).toContain('icon.png')
  expect(await readFile(join(result.outDir, 'manifest.json'), 'utf8')).toContain(
    'test-miniapp',
  )
})

test('builds and packages files at the ZIP root', async () => {
  const root = await createProject()
  const result = await packageMiniapp({ root })

  expect(result.outFile).toBe(join(root, 'artifacts/test-miniapp-1.2.3.zip'))
  const entries = execFileSync('unzip', ['-Z1', result.outFile], {
    encoding: 'utf8',
  })
    .trim()
    .split('\n')

  expect(entries).toContain('manifest.json')
  expect(entries).toContain('index.html')
  expect(entries.some((entry) => entry.startsWith('output/'))).toBe(false)
})

test('rejects missing manifest entries and sourcemaps', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'miniapp-invalid-'))
  directories.push(directory)
  await writeFile(
    join(directory, 'manifest.json'),
    JSON.stringify({
      name: 'invalid',
      title: 'Invalid',
      version: '1.0.0',
      entry: { url: 'index.html' },
    }),
  )

  await expect(validateMiniappDirectory(directory)).rejects.toThrow(
    'points to a missing file',
  )

  await Promise.all([
    writeFile(join(directory, 'index.html'), '<!doctype html>'),
    mkdir(join(directory, 'assets')),
  ])
  await writeFile(join(directory, 'assets/index.js.map'), '{}')
  await expect(validateMiniappDirectory(directory)).rejects.toThrow(
    'must not contain sourcemaps',
  )
})
