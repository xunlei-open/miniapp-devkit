import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import type { ViteDevServer } from 'vite'
import { afterEach, expect, test, vi } from 'vitest'
import { buildMiniapp, devMiniapp } from '../src/vite.js'
import { packageMiniapp } from '../src/package.js'
import { validateMiniappDirectory } from '../src/validate.js'

const roots: string[] = []
const servers: ViteDevServer[] = []

afterEach(async () => {
  for (const server of servers.splice(0)) await server.close()
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
  vi.restoreAllMocks()
})

async function project(withEvents = true) {
  const root = await mkdtemp(join(tmpdir(), 'miniapp-dev-'))
  roots.push(root)
  await mkdir(join(root, 'src/events'), { recursive: true })
  await writeFile(join(root, 'miniapp.config.mjs'), `export default {
    vite: {
      server: { port: 0 }, logLevel: 'silent', build: { outDir: 'output' },
      plugins: [(() => {
        let command;
        return {
          name: 'stateful-framework-probe',
          configResolved(config) { command = config.command },
          transform(code, id) {
            if (id.endsWith('/main.ts') && command !== 'serve') throw new Error('Page plugin was reused by the event build');
          },
        };
      })()],
    },
  }`)
  await writeFile(join(root, 'manifest.json'), JSON.stringify({
    name: 'dev-test', title: 'Dev Test', version: '1.0.0', icon: 'icon.svg',
    entry: { type: 'miniapp', url: 'index.html' },
    ...(withEvents ? { scripts: [{ event: 'onResolve', entry: 'events/onResolve.js' }] } : {}),
  }))
  await writeFile(join(root, 'index.html'), '<!doctype html><html><head></head><body><script type="module" src="/main.ts"></script></body></html>')
  await writeFile(join(root, 'main.ts'), 'document.body.dataset.loaded = "yes"')
  await writeFile(join(root, 'icon.svg'), '<svg>initial-icon</svg>')
  await writeFile(join(root, 'src/shared.ts'), 'export const value: string = "initial-event"')
  if (withEvents) {
    await writeFile(join(root, 'src/events/onResolve.ts'), 'import { value } from "../shared"; globalThis.eventValue = value')
  }
  return root
}

async function eventCode(root: string): Promise<string> {
  async function read(dir: string): Promise<string[]> {
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
    const result: string[] = []
    for (const entry of entries) {
      const file = join(dir, entry.name)
      if (entry.isDirectory()) result.push(...await read(file))
      else result.push(await readFile(file, 'utf8').catch(() => ''))
    }
    return result
  }
  return (await read(join(root, 'output/events'))).join('\n')
}

test('dev embeds a local connection monitor and build removes it', async () => {
  const root = await project(false)
  await mkdir(join(root, 'output'), { recursive: true })
  await writeFile(join(root, 'output/miniapp-dev-client.js'), '// Local development bootstrap: must work without the dev server.\noldBootstrap()')
  const source = await readFile(join(root, 'index.html'), 'utf8')
  const server = await devMiniapp({ root })
  servers.push(server)
  const html = await readFile(join(root, 'output/index.html'), 'utf8')
  expect(html).toMatch(/data-miniapp-dev-src="http:\/\/[^\"]+\/main.ts" data-miniapp-dev-module/)
  expect(html).not.toMatch(/<script[^>]* type="module"/)
  expect(html).toContain('type="application/x-miniapp-dev-module"')
  expect(html).not.toContain('src="./miniapp-dev-client.js"')
  const code = html.match(/<script data-miniapp-dev-load-error[^>]*>([\s\S]*?)<\/script>/)![1]!
  expect(code).not.toMatch(/[\r\n]/)
  await expect(readFile(join(root, 'output/miniapp-dev-client.js'))).rejects.toMatchObject({ code: 'ENOENT' })

  const probeUrl = html.match(/data-miniapp-dev-probe="([^"]+)"/)![1]!
  const ping = await fetch(probeUrl, { headers: { Accept: 'text/x-vite-ping', Origin: 'null' } })
  expect(ping.status).toBe(204)
  expect(ping.headers.get('access-control-allow-origin')).toBe('null')

  const listeners = new Map<string, () => void>()
  const timer = vi.fn()
  const placeholders = ['/preamble.js', '/main.ts'].map(src => ({
    attributes: [{ name: 'type', value: 'application/x-miniapp-dev-module' }, { name: 'data-miniapp-dev-src', value: src }, { name: 'data-miniapp-dev-module', value: '' }],
    getAttribute: () => src,
    replaceWith: vi.fn(),
  }))
  const document = {
    currentScript: { getAttribute: () => probeUrl },
    querySelectorAll: vi.fn(() => placeholders.slice()),
    createElement: vi.fn(() => ({ setAttribute: vi.fn(), addEventListener: vi.fn(), type: '', src: '' })),
  }
  runInNewContext(code, {
    window: { addEventListener: (name: string, callback: () => void) => listeners.set(name, callback) },
    document,
    setTimeout: timer,
    setInterval: vi.fn(),
    AbortController,
    fetch: vi.fn().mockResolvedValue({ status: 204 }),
  })
  expect(document.createElement).not.toHaveBeenCalled()
  listeners.get('load')!()
  expect(document.createElement).not.toHaveBeenCalled()
  timer.mock.calls[0]![0]()
  expect(placeholders[0]!.replaceWith).toHaveBeenCalledWith(expect.objectContaining({ type: 'module', src: '/preamble.js' }))
  expect(placeholders[1]!.replaceWith).not.toHaveBeenCalled()
  document.createElement.mock.results[0]!.value.addEventListener.mock.calls[0]![1]()
  expect(placeholders[1]!.replaceWith).toHaveBeenCalledWith(expect.objectContaining({ type: 'module', src: '/main.ts' }))

  expect(await readFile(join(root, 'index.html'), 'utf8')).toBe(source)
  await server.close()
  servers.splice(servers.indexOf(server), 1)
  await writeFile(join(root, 'miniapp.config.mjs'), "export default { vite: { logLevel: 'silent', build: { outDir: 'output' } } }")
  await buildMiniapp({ root })
  const builtHtml = await readFile(join(root, 'output/index.html'), 'utf8')
  expect(builtHtml).not.toContain('miniapp-dev-')
  expect(builtHtml).not.toContain('dev server')
  expect(builtHtml).not.toContain('/main.ts')
  await expect(readFile(join(root, 'output/miniapp-dev-client.js'))).rejects.toMatchObject({ code: 'ENOENT' })
})

test('dev builds event scripts and watches their imports without overwriting the HMR page', async () => {
  const root = await project()
  const server = await devMiniapp({ root })
  servers.push(server)
  const html = await readFile(join(root, 'output/index.html'), 'utf8')
  expect(html).toContain('miniapp-dev-entry:')
  expect(html).toContain('/@vite/client')
  expect(await eventCode(root)).toContain('initial-event')
  expect(await readFile(join(root, 'output/events/onResolve.js'), 'utf8')).not.toContain('import.meta.hot')

  await writeFile(join(root, 'src/shared.ts'), 'export const value: string = "updated-dependency"')
  await expect.poll(() => eventCode(root), { timeout: 10000 }).toContain('updated-dependency')
  const errors = vi.spyOn(server.config.logger, 'error')
  await writeFile(join(root, 'src/shared.ts'), 'export const value = ;')
  await expect.poll(() => errors.mock.calls.some(call => String(call[0]).includes('Event build failed')), { timeout: 10000 }).toBe(true)
  expect(await eventCode(root)).toContain('updated-dependency')
  await writeFile(join(root, 'src/shared.ts'), 'export const value = "recovered-event"')
  await expect.poll(() => eventCode(root), { timeout: 10000 }).toContain('recovered-event')
  await writeFile(join(root, 'src/events/onDone.ts'), 'import { value } from "../shared"; globalThis.doneValue = value')
  await expect.poll(() => readFile(join(root, 'output/events/onDone.js'), 'utf8').catch(() => ''), { timeout: 10000 }).toContain('doneValue')
  await rm(join(root, 'src/events/onDone.ts'))
  await expect.poll(() => readFile(join(root, 'output/events/onDone.js'), 'utf8').then(() => true, () => false), { timeout: 10000 }).toBe(false)
  expect(await readFile(join(root, 'output/index.html'), 'utf8')).toBe(html)
  const url = server.resolvedUrls!.local[0]!
  expect((await fetch(new URL('/main.ts', url))).status).toBe(200)
}, 30000)

test('dev synchronizes the declared icon on edits, removal and recreation', async () => {
  const root = await project(false)
  const server = await devMiniapp({ root })
  servers.push(server)
  expect(await readFile(join(root, 'output/icon.svg'), 'utf8')).toContain('initial-icon')
  await writeFile(join(root, 'icon.svg'), '<svg>updated-icon</svg>')
  await expect.poll(() => readFile(join(root, 'output/icon.svg'), 'utf8'), { timeout: 10000 }).toContain('updated-icon')
  await rm(join(root, 'icon.svg'))
  await expect.poll(() => readFile(join(root, 'output/icon.svg')).then(() => true, () => false), { timeout: 10000 }).toBe(false)
  await writeFile(join(root, 'icon.svg'), '<svg>restored-icon</svg>')
  await expect.poll(() => readFile(join(root, 'output/icon.svg'), 'utf8').catch(() => ''), { timeout: 10000 }).toContain('restored-icon')
}, 30000)

test('dev rejects missing manifest event sources instead of reporting ready', async () => {
  const root = await project()
  await rm(join(root, 'src/events/onResolve.ts'))
  await expect(devMiniapp({ root })).rejects.toThrow('has no built event entry')
})

test('events-only apps support dev, dependency and icon updates, build and package without HTML', async () => {
  const root = await project()
  const manifest = JSON.parse(await readFile(join(root, 'manifest.json'), 'utf8'))
  delete manifest.entry
  await writeFile(join(root, 'manifest.json'), JSON.stringify(manifest))
  await rm(join(root, 'index.html'))
  await rm(join(root, 'main.ts'))

  const server = await devMiniapp({ root })
  servers.push(server)
  expect(server.httpServer).toBeNull()
  expect(await eventCode(root)).toContain('initial-event')
  expect(JSON.parse(await readFile(join(root, 'output/manifest.json'), 'utf8'))).toEqual(manifest)
  await expect(readFile(join(root, 'output/index.html'))).rejects.toMatchObject({ code: 'ENOENT' })
  await writeFile(join(root, 'src/shared.ts'), 'export const value = "events-only-update"')
  await expect.poll(() => eventCode(root), { timeout: 10000 }).toContain('events-only-update')
  await writeFile(join(root, 'icon.svg'), '<svg>events-only-icon</svg>')
  await expect.poll(() => readFile(join(root, 'output/icon.svg'), 'utf8'), { timeout: 10000 }).toContain('events-only-icon')
  await server.close()
  servers.splice(servers.indexOf(server), 1)

  const { outDir } = await buildMiniapp({ root })
  expect((await validateMiniappDirectory(outDir)).files.sort()).toEqual([
    'events/onResolve.js', 'icon.svg', 'manifest.json',
  ])
  const { outFile } = await packageMiniapp({ root })
  const zip = await readFile(outFile)
  expect(zip.readUInt32LE(0)).toBe(0x04034b50)
  for (const name of ['events/onResolve.js', 'icon.svg', 'manifest.json']) {
    expect(zip.includes(Buffer.from(name))).toBe(true)
  }
  expect(zip.includes(Buffer.from('index.html'))).toBe(false)
}, 30000)
