import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, expect, test } from 'vitest'
import { readMiniappManifest, validateMiniappDirectory } from '../src/validate.js'

const scratchRoot = fileURLToPath(new URL('../../../.scratch/file-associations/', import.meta.url))
const directories: string[] = []

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

/** 为源清单和打包校验提供真实文件，保留调用方声明的大小写与扩展元数据。 */
async function createManifest(entry: unknown) {
  await mkdir(scratchRoot, { recursive: true })
  const root = await mkdtemp(join(scratchRoot, 'manifest-'))
  directories.push(root)
  const manifestPath = join(root, 'manifest.json')
  await writeFile(manifestPath, JSON.stringify({ name: 'file-viewer', title: 'File Viewer', version: '1.0.0', entry }))
  await writeFile(join(root, 'index.html'), '<!doctype html>')
  return { root, manifestPath }
}

test('source and package validation preserve file associations and entry metadata', async () => {
  const entry = { url: 'index.html', file_associations: ['.JPG', '.jpg', '.tar.gz'], custom: 'retained' }
  const { root, manifestPath } = await createManifest(entry)
  expect((await readMiniappManifest(manifestPath)).entry).toEqual(entry)
  expect((await validateMiniappDirectory(root)).manifest.entry).toEqual(entry)
})

test.each([undefined, []])('accepts absent and empty associations: %j', async (fileAssociations) => {
  const { manifestPath } = await createManifest({
    type: 'in_app_webview',
    url: 'https://example.com',
    file_associations: fileAssociations,
  })
  await expect(readMiniappManifest(manifestPath)).resolves.toHaveProperty('entry.type', 'in_app_webview')
})

test.each([
  null,
  '.jpg',
  {},
  [1],
  [''],
  ['.'],
  ['jpg'],
  ['*.jpg'],
  ['.*'],
  ['.jp?g'],
  ['.jpg '],
  ['.tar..gz'],
  ['.jpg/other'],
  ['.jpg\\other'],
])('rejects malformed file associations: %j', async (fileAssociations) => {
  const { root, manifestPath } = await createManifest({ url: 'index.html', file_associations: fileAssociations })
  await expect(readMiniappManifest(manifestPath)).rejects.toThrow('entry.file_associations')
  await expect(validateMiniappDirectory(root)).rejects.toThrow('entry.file_associations')
})

test('rejects nonempty file associations for in_app_webview', async () => {
  const { manifestPath } = await createManifest({
    type: 'in_app_webview',
    url: 'https://example.com',
    file_associations: ['.jpg'],
  })
  await expect(readMiniappManifest(manifestPath)).rejects.toThrow('only supported by miniapp')
})
