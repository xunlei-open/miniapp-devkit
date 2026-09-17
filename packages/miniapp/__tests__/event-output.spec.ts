import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, test } from 'vitest'
import { eventOutput } from '../src/event-output.js'

const roots: string[] = []
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }) })
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'event-output-'))
  roots.push(root)
  return { root, publish: eventOutput(root, ['index.html', 'manifest.json', 'icon.svg']) }
}
const entries = new Set(['events/onStart.js'])
const required = [...entries]
test.each(['./events/onStart.js', 'events/./onStart.js', 'events/nested/../onStart.js'])(
  'matches the normalized manifest entry %s', async entry => {
    const { root, publish } = await fixture()
    await publish(new Map([['events/onStart.js', 'good']]), entries, [entry])
    expect(await readFile(join(root, 'events/onStart.js'), 'utf8')).toBe('good')
    for (const invalid of ['./events/missing.js', '../events/onStart.js']) {
      await expect(publish(new Map([['events/onStart.js', 'bad']]), entries, [invalid])).rejects.toThrow('has no built event entry')
      expect(await readFile(join(root, 'events/onStart.js'), 'utf8')).toBe('good')
    }
  },
)
test('publishes dependencies outside events and retains old dependencies after rebuild', async () => {
  const { root, publish } = await fixture()
  await publish(new Map([['events/onStart.js', 'first'], ['assets/a.js', 'old worker']]), entries, required)
  await publish(new Map([['events/onStart.js', 'second'], ['assets/b.wasm', 'new wasm']]), entries, required)
  expect(await readFile(join(root, 'events/onStart.js'), 'utf8')).toBe('second')
  expect(await readFile(join(root, 'assets/a.js'), 'utf8')).toBe('old worker')
  await publish(new Map(), new Set(), [])
  await expect(readFile(join(root, 'events/onStart.js'))).rejects.toMatchObject({ code: 'ENOENT' })
  expect(await readFile(join(root, 'assets/b.wasm'), 'utf8')).toBe('new wasm')
  expect((await readdir(root)).some(name => name.startsWith('.miniapp-events-'))).toBe(false)
})
test('validates the complete build before changing an existing entry', async () => {
  const { root, publish } = await fixture()
  await publish(new Map([['events/onStart.js', 'good']]), entries, required)
  for (const name of ['../outside.js', '/absolute.js', 'C:/outside.js', 'assets/../index.html', 'index.html', 'index.html.', 'assets /bad.js', 'MANIFEST.JSON', 'icon.svg']) {
    await expect(publish(new Map([['events/onStart.js', 'bad'], [name, 'bad']]), entries, required)).rejects.toThrow()
    expect(await readFile(join(root, 'events/onStart.js'), 'utf8')).toBe('good')
  }
  await expect(publish(new Map([['assets/new.js', 'new']]), new Set(), required)).rejects.toThrow('has no built event entry')
  await expect(readFile(join(root, 'assets/new.js'))).rejects.toMatchObject({ code: 'ENOENT' })
})
test('reuses identical resources but refuses to overwrite a conflicting dependency', async () => {
  const { root, publish } = await fixture()
  await mkdir(join(root, 'assets'))
  await writeFile(join(root, 'assets/shared.js'), 'ui')
  await publish(new Map([['events/onStart.js', 'good'], ['assets/shared.js', 'ui']]), entries, required)
  await expect(publish(new Map([['events/onStart.js', 'bad'], ['assets/shared.js', 'event']]), entries, required)).rejects.toThrow('conflicts')
  expect(await readFile(join(root, 'events/onStart.js'), 'utf8')).toBe('good')
  expect(await readFile(join(root, 'assets/shared.js'), 'utf8')).toBe('ui')
  await expect(publish(new Map([['assets/a.js', 'a'], ['assets/A.js', 'b']]), new Set(), [])).rejects.toThrow('conflicting')
})
test('does not remove externally changed entries or follow directory junctions', async () => {
  const { root, publish } = await fixture()
  await publish(new Map([['events/onStart.js', 'good']]), entries, required)
  await writeFile(join(root, 'events/onStart.js'), 'external')
  await expect(publish(new Map(), new Set(), [])).rejects.toThrow('modified outside')
  const outside = await mkdtemp(join(tmpdir(), 'event-outside-'))
  roots.push(outside)
  await symlink(outside, join(root, 'linked'), process.platform === 'win32' ? 'junction' : 'dir')
  await expect(publish(new Map([['linked/escape.js', 'bad']]), new Set(), [])).rejects.toThrow('symbolic link')
  expect(await readdir(outside)).toEqual([])
})
