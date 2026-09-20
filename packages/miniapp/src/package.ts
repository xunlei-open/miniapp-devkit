import { createWriteStream } from 'node:fs'
import { mkdir, mkdtemp, rename, rm, rmdir } from 'node:fs/promises'
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { pipeline } from 'node:stream/promises'
import yazl from 'yazl'
import { loadMiniappConfig } from './config.js'
import type { PackageMiniappOptions, ResolvedMiniappConfig } from './types.js'
import { validateMiniappDirectory } from './validate.js'
import { buildMiniapp, resolveOutputDirectory } from './vite.js'

const ZIP_DATE = new Date('1980-01-01T00:00:00.000Z')

function safeFilePart(value: string): string {
  return (
    value
      .trim()
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'miniapp'
  )
}

function resolveArchivePath(
  config: ResolvedMiniappConfig,
  manifest: { name: string; version: string },
  explicitPath?: string,
): string {
  if (explicitPath) {
    if (!explicitPath.toLowerCase().endsWith('.zip')) {
      throw new Error('--out must end with .zip')
    }
    return isAbsolute(explicitPath) ? explicitPath : resolve(config.root, explicitPath)
  }

  const fileName = config.packageFileName ?? `${safeFilePart(manifest.name)}-${safeFilePart(manifest.version)}.zip`
  if (!fileName.toLowerCase().endsWith('.zip')) {
    throw new Error('package.fileName must end with .zip')
  }
  if (basename(fileName) !== fileName) {
    throw new Error('package.fileName must not contain a directory')
  }
  return resolve(config.root, config.packageOutDir, fileName)
}

async function writeZip(directory: string, files: string[], outFile: string): Promise<void> {
  await mkdir(dirname(outFile), { recursive: true })
  const staging = await mkdtemp(resolve(dirname(outFile), '.miniapp-package-'))
  const temporaryArchive = resolve(staging, 'package.zip')
  const archive = new yazl.ZipFile()
  const output = createWriteStream(temporaryArchive)
  const completed = pipeline(archive.outputStream, output)
  // Observe stream failures immediately, including while entries are being added.
  void completed.catch(() => {})
  try {
    for (const file of files) {
      archive.addFile(resolve(directory, file), file, {
        mtime: ZIP_DATE,
        mode: 0o644,
        compress: true,
      })
    }
    archive.end()
    await completed
    await rename(temporaryArchive, outFile)
  } catch (error) {
    output.destroy()
    await completed.catch(() => {})
    throw error
  } finally {
    await rm(temporaryArchive, { force: true })
    await rmdir(staging)
  }
}

async function removeBuildFiles(directory: string, files: string[]) {
  const directories = new Set<string>()
  for (const file of files) {
    const path = resolve(directory, file)
    const rel = relative(directory, path)
    if (!rel || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
      throw new Error(`Cannot clean a file outside the build output: ${file}`)
    }
    await rm(path, { force: true })
    for (let parent = dirname(path); parent !== directory; parent = dirname(parent)) directories.add(parent)
  }
  // Remove only empty directories; preserve the ZIP and any files added after validation.
  for (const path of [...directories].sort((a, b) => b.length - a.length)) {
    await rmdir(path).catch((error) => {
      if (!['ENOENT', 'ENOTEMPTY', 'EEXIST'].includes(error.code)) throw error
    })
  }
}

export async function packageMiniapp(
  options: PackageMiniappOptions = {},
): Promise<{ outFile: string; outDir: string }> {
  let config: ResolvedMiniappConfig
  let outDir: string

  if (options.build ?? true) {
    ;({ config, outDir } = await buildMiniapp(options))
  } else {
    const root = options.root ?? process.cwd()
    const mode = options.mode ?? 'production'
    config = await loadMiniappConfig(root, {
      command: 'build',
      mode,
      isSsrBuild: false,
      isPreview: false,
    })
    outDir = resolveOutputDirectory(config)
  }

  const validated = await validateMiniappDirectory(outDir)
  const outFile = resolveArchivePath(config, validated.manifest, options.outFile)
  const archiveRelativeToDev = relative(resolve(config.root, config.devOutDir), outFile)
  if (
    archiveRelativeToDev === '' ||
    (archiveRelativeToDev !== '..' && !archiveRelativeToDev.startsWith(`..${sep}`) && !isAbsolute(archiveRelativeToDev))
  ) {
    throw new Error('Package output must be outside the development output directory')
  }
  // Repackaging with --no-build must not include the previous destination ZIP itself.
  const files = validated.files.filter((file) => relative(resolve(outDir, file), outFile) !== '')
  await writeZip(outDir, files, outFile)
  if (options.build ?? true) await removeBuildFiles(outDir, files)
  return { outFile, outDir }
}
