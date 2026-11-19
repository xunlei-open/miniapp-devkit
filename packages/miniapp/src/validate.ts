import { lstat, readFile, readdir } from 'node:fs/promises'
import { isAbsolute, relative, resolve, sep, win32 } from 'node:path'
import type { MiniappManifest } from '@xunlei-open/miniapp-types'
import type { MiniappValidationResult } from './types.js'

function assertNonEmptyString(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`manifest.${field} must be a non-empty string`)
  }
}

function resolvePackagePath(directory: string, value: string, field: string): string {
  if (isAbsolute(value) || win32.isAbsolute(value)) {
    throw new Error(`manifest.${field} must be relative to the package root`)
  }

  const target = resolve(directory, value)
  const relativePath = relative(directory, target)
  if (relativePath === '..' || relativePath.startsWith(`..${sep}`)) {
    throw new Error(`manifest.${field} points outside the package root`)
  }
  return target
}

async function assertPackageFile(directory: string, value: unknown, field: string): Promise<void> {
  assertNonEmptyString(value, field)
  const target = resolvePackagePath(directory, value, field)
  let stat
  try {
    stat = await lstat(target)
  } catch {
    throw new Error(`manifest.${field} points to a missing file: ${value}`)
  }
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error(`manifest.${field} must point to a regular package file: ${value}`)
  }
}

async function collectFiles(directory: string, current = directory): Promise<string[]> {
  const entries = await readdir(current, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const absolutePath = resolve(current, entry.name)
    const packagePath = relative(directory, absolutePath).split(sep).join('/')

    if (entry.isSymbolicLink()) {
      throw new Error(`Package must not contain symbolic links: ${packagePath}`)
    }
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(directory, absolutePath)))
      continue
    }
    if (entry.isFile()) files.push(packagePath)
  }

  return files
}

/** 读取清单并校验必填元信息及入口文件关联，保留原始声明供构建使用。 */
export async function readMiniappManifest(manifestPath: string): Promise<MiniappManifest> {
  let value: unknown
  try {
    value = JSON.parse(await readFile(manifestPath, 'utf8'))
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new Error(`Unable to read manifest: ${reason}`)
  }

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('manifest.json must contain a JSON object')
  }

  const manifest = value as MiniappManifest
  assertNonEmptyString(manifest.name, 'name')
  assertNonEmptyString(manifest.title, 'title')
  assertNonEmptyString(manifest.version, 'version')
  assertFileAssociations(manifest.entry)
  return manifest
}

/** 在开发和打包阶段拒绝非法文件关联，归一化交由宿主运行时完成。 */
function assertFileAssociations(entry: MiniappManifest['entry']): void {
  const associations = entry?.file_associations
  if (associations === undefined) return
  if (
    !Array.isArray(associations) ||
    associations.some(
      (extension) => typeof extension !== 'string' || !/^\.[^.\s/\\*?]+(?:\.[^.\s/\\*?]+)*$/u.test(extension),
    )
  ) {
    throw new Error(
      'manifest.entry.file_associations must contain dot-prefixed file extensions, such as .jpg or .tar.gz',
    )
  }
  if (associations.length > 0 && (entry?.type ?? 'miniapp') !== 'miniapp') {
    throw new Error('manifest.entry.file_associations is only supported by miniapp entries')
  }
}

export async function validateSourceManifest(manifestPath: string): Promise<MiniappManifest> {
  return readMiniappManifest(manifestPath)
}

export async function validateMiniappDirectory(directoryPath: string): Promise<MiniappValidationResult> {
  const directory = resolve(directoryPath)
  const directoryStat = await lstat(directory).catch(() => undefined)
  if (!directoryStat?.isDirectory()) {
    throw new Error(`Miniapp output directory does not exist: ${directory}`)
  }

  const manifestPath = resolve(directory, 'manifest.json')
  const manifest = await readMiniappManifest(manifestPath)

  if (manifest.icon !== undefined) {
    await assertPackageFile(directory, manifest.icon, 'icon')
  }
  if (manifest.entry && (manifest.entry.type ?? 'miniapp') === 'miniapp') {
    await assertPackageFile(directory, manifest.entry.url, 'entry.url')
    const html = await readFile(resolve(directory, manifest.entry.url), 'utf8')
    if (html.startsWith('<!-- miniapp-dev-entry:')) {
      throw new Error('Output contains a development entry. Run build before validating or packaging.')
    }
  }
  for (const [index, script] of (manifest.scripts ?? []).entries()) {
    await assertPackageFile(directory, script.entry, `scripts[${index}].entry`)
  }

  const files = await collectFiles(directory)
  const sourcemap = files.find((file) => file.endsWith('.map'))
  if (sourcemap) {
    throw new Error(`Package must not contain sourcemaps: ${sourcemap}`)
  }
  const dependency = files.find((file) => file.split('/').includes('node_modules'))
  if (dependency) {
    throw new Error(`Package must not contain node_modules: ${dependency}`)
  }

  return { directory, manifestPath, manifest, files }
}
