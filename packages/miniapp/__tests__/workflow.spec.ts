import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, test } from 'vitest'
import { packageMiniapp } from '../src/package.js'
import { validateMiniappDirectory } from '../src/validate.js'
import { buildMiniapp } from '../src/vite.js'

const directories: string[] = []

function zipEntries(file: string) {
  return execFileSync(
    process.platform === 'win32' ? 'tar' : 'unzip',
    process.platform === 'win32' ? ['-tf', file] : ['-Z1', file],
    { encoding: 'utf8' },
  )
    .trim()
    .split(/\r?\n/)
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
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
  expect(await readFile(join(result.outDir, 'manifest.json'), 'utf8')).toContain('test-miniapp')
})

test('builds and packages files at the ZIP root', async () => {
  const root = await createProject()
  const result = await packageMiniapp({ root })

  expect(result.outFile).toBe(join(root, 'artifacts/test-miniapp-1.2.3.zip'))
  const entries = zipEntries(result.outFile)

  expect(entries).toContain('manifest.json')
  expect(entries).toContain('index.html')
  expect(entries.some((entry) => entry.startsWith('output/'))).toBe(false)
})

test('default packaging leaves only the ZIP in output and supports repeat builds', async () => {
  const root = await createProject()
  await writeFile(join(root, 'miniapp.config.ts'), "export default { vite: { logLevel: 'silent' } }")
  for (let i = 0; i < 2; i++) {
    const result = await packageMiniapp({ root })
    expect(result.outDir).toBe(join(root, 'output'))
    expect(await readdir(result.outDir)).toEqual(['test-miniapp-1.2.3.zip'])
    expect(zipEntries(result.outFile)).toEqual(expect.arrayContaining(['manifest.json', 'index.html', 'icon.png']))
    expect(zipEntries(result.outFile).some((name) => name.endsWith('.zip') || name.startsWith('output/'))).toBe(false)
  }
})

test('no-build packaging retains inputs and does not include its previous ZIP', async () => {
  const root = await createProject()
  await writeFile(join(root, 'miniapp.config.ts'), "export default { vite: { logLevel: 'silent' } }")
  const { outDir } = await buildMiniapp({ root })
  for (let i = 0; i < 2; i++) {
    const result = await packageMiniapp({ root, build: false })
    expect(await readFile(join(outDir, 'manifest.json'), 'utf8')).toContain('test-miniapp')
    expect(zipEntries(result.outFile)).toContain('index.html')
    expect(zipEntries(result.outFile).some((name) => name.endsWith('.zip'))).toBe(false)
  }
})

test('a failed ZIP publication retains the built files', async () => {
  const root = await createProject()
  const destination = join(root, 'blocked.zip')
  await mkdir(destination)
  await writeFile(join(destination, 'keep.txt'), 'existing directory')
  await expect(packageMiniapp({ root, outFile: destination })).rejects.toThrow()
  expect((await validateMiniappDirectory(join(root, 'output'))).files).toContain('index.html')
  expect(await readFile(join(destination, 'keep.txt'), 'utf8')).toBe('existing directory')
  expect((await readdir(root)).some((name) => name.startsWith('.miniapp-package-'))).toBe(false)
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

  await expect(validateMiniappDirectory(directory)).rejects.toThrow('points to a missing file')

  await Promise.all([writeFile(join(directory, 'index.html'), '<!doctype html>'), mkdir(join(directory, 'assets'))])
  await writeFile(join(directory, 'assets/index.js.map'), '{}')
  await expect(validateMiniappDirectory(directory)).rejects.toThrow('must not contain sourcemaps')
})
