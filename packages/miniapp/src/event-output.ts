import { lstat, mkdir, mkdtemp, readFile, rename, rm, rmdir, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'

export type EventFiles = Map<string, string | Uint8Array>

/** Event entries are replaceable; dependencies are immutable for the dev session. */
export function eventOutput(outDir: string, protectedFiles: string[]) {
  const root = resolve(outDir)
  const key = (name: string) => name.toLowerCase()
  const protectedNames = new Set(protectedFiles.map(key))
  let previousEntries = new Map<string, Buffer>()

  function target(name: string) {
    if (!name || isAbsolute(name) || name.includes('\\') || name.includes(':')
      || name.split('/').some(part => !part || part === '.' || part === '..' || /[. ]$/.test(part))) {
      throw new Error(`Event build emitted an invalid output path: ${name}`)
    }
    const path = resolve(root, name)
    const rel = relative(root, path)
    if (!rel || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
      throw new Error(`Event build emitted a file outside the output directory: ${name}`)
    }
    return path
  }

  async function checkPath(path: string) {
    // Do not allow symlinks/junctions to bypass the output-directory boundary.
    for (let current = path; ; current = dirname(current)) {
      const stat = await lstat(current).catch(error => {
        if (error.code === 'ENOENT') return undefined
        throw error
      })
      if (stat?.isSymbolicLink()) throw new Error(`Event output contains a symbolic link: ${current}`)
      if (current === root) break
    }
  }

  async function existing(path: string) {
    return readFile(path).catch(error => {
      if (error.code === 'ENOENT') return undefined
      throw error
    })
  }

  return async (files: EventFiles, entries: Set<string>, requiredEntries: string[]) => {
    const names = new Set<string>()
    const contents = new Map<string, Buffer>()
    const unchanged = new Set<string>()
    // Validate the entire result before publishing any part of it.
    for (const [name, content] of files) {
      target(name)
      if (protectedNames.has(key(name))) throw new Error(`Event build would overwrite a protected file: ${name}`)
      if (names.has(key(name))) throw new Error(`Event build emitted conflicting output names: ${name}`)
      names.add(key(name))
      contents.set(name, Buffer.from(content))
    }
    for (const entry of entries) {
      if (!entry.startsWith('events/') || !files.has(entry)) throw new Error(`Invalid event entry: ${entry}`)
    }
    for (const entry of requiredEntries) {
      const name = relative(root, resolve(root, entry)).split(sep).join('/')
      if (!entries.has(name)) throw new Error(`manifest script "${entry}" has no built event entry`)
    }
    for (const [name, bytes] of contents) {
      const path = target(name)
      await checkPath(path)
      const old = await existing(path)
      if (old?.equals(bytes)) unchanged.add(name)
      if (old && !old.equals(bytes)) {
        if (!entries.has(name)) throw new Error(`Event output conflicts with an existing file: ${name}. Use content-hashed dependency filenames.`)
        const owned = previousEntries.get(name)
        if (owned && !owned.equals(old)) throw new Error(`Event entry was modified outside the event build: ${name}`)
      }
    }
    // A removed entry is ours only while its bytes still match what we published.
    for (const [name, bytes] of previousEntries) {
      if (entries.has(name)) continue
      await checkPath(target(name))
      const old = await existing(target(name))
      if (old && !old.equals(bytes)) throw new Error(`Event entry was modified outside the event build: ${name}`)
    }

    await mkdir(root, { recursive: true })
    const staging = await mkdtemp(join(root, '.miniapp-events-'))
    const staged: string[] = []
    try {
      const ordered = [...contents].filter(([name]) => !unchanged.has(name))
        .sort(([a], [b]) => Number(entries.has(a)) - Number(entries.has(b)))
      for (const [index, [, bytes]] of ordered.entries()) {
        const path = join(staging, String(index))
        staged.push(path)
        await writeFile(path, bytes)
      }
      // Publish dependencies first, then atomically replace each entry file.
      for (const [index, [name]] of ordered.entries()) {
        const path = target(name)
        await mkdir(dirname(path), { recursive: true })
        await rename(staged[index]!, path)
      }
      for (const name of previousEntries.keys()) {
        if (!entries.has(name)) await rm(target(name), { force: true })
      }
      previousEntries = new Map([...contents].filter(([name]) => entries.has(name)))
      // Keep old dependencies: an already-running event/Worker may still import them.
    } finally {
      for (const path of staged) await rm(path, { force: true })
      await rmdir(staging)
    }
  }
}
