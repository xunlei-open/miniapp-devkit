import { createWriteStream } from 'node:fs'
import { mkdir, rm } from 'node:fs/promises'
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { pipeline } from 'node:stream/promises'
import yazl from 'yazl'
import { loadMiniappConfig } from './config.js'
import type {
  PackageMiniappOptions,
  ResolvedMiniappConfig,
} from './types.js'
import { validateMiniappDirectory } from './validate.js'
import { buildMiniapp, resolveOutputDirectory } from './vite.js'

const ZIP_DATE = new Date('1980-01-01T00:00:00.000Z')

function safeFilePart(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'miniapp'
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

  const fileName =
    config.packageFileName ??
    `${safeFilePart(manifest.name)}-${safeFilePart(manifest.version)}.zip`
  if (!fileName.toLowerCase().endsWith('.zip')) {
    throw new Error('package.fileName must end with .zip')
  }
  if (basename(fileName) !== fileName) {
    throw new Error('package.fileName must not contain a directory')
  }
  return resolve(config.root, config.packageOutDir, fileName)
}

async function writeZip(
  directory: string,
  files: string[],
  outFile: string,
): Promise<void> {
  await mkdir(dirname(outFile), { recursive: true })

  const archive = new yazl.ZipFile()
  const output = createWriteStream(outFile)
  const completed = pipeline(archive.outputStream, output)
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
  } catch (error) {
    await rm(outFile, { force: true })
    throw error
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
  const archiveRelativeToOutput = relative(outDir, outFile)
  if (
    archiveRelativeToOutput === '' ||
    (!archiveRelativeToOutput.startsWith(`..${sep}`) && archiveRelativeToOutput !== '..')
  ) {
    throw new Error('Package output must be outside the build output directory')
  }

  await writeZip(outDir, validated.files, outFile)
  return { outFile, outDir }
}
