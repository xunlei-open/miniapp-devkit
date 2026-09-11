import { afterEach, expect, test, vi } from 'vitest'
import type { OnResolveContext } from '@xunlei-open/miniapp-types'
import { parseAssets, releaseResource, repositoryUrl, resolveRelease } from '../src/release'

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules() })

test.each(['cli/cli', 'https://github.com/cli/cli', 'https://github.com/cli/cli.git',
  'https://github.com/cli/cli/releases/latest?x=1#assets', 'https://github.com/cli/cli/releases/'])('normalizes %s', input => {
  expect(repositoryUrl(input)).toBe('https://github.com/cli/cli')
})

test.each(['', 'cli', 'https://evil.test/cli/cli', 'https://github.com.evil.test/cli/cli',
  'https://github.com@evil.test/cli/cli', 'https://github.com/cli/cli/releases/download/v1/a.zip',
  'https://github.com/cli/cli/archive/refs/tags/v1.zip', 'https://github.com/cli/cli/issues/1'])('rejects non-repository input %s', input => {
  expect(() => repositoryUrl(input)).toThrow()
})

const fragment = `<ul>
  <li><a href="/cli/cli/releases/download/v1/app.zip"><span>Friendly label</span></a></li>
  <li><a href="/cli/cli/releases/download/v1/app.zip">Duplicate</a></li>
  <li><a href="/cli/cli/releases/download/v1/a%20b.exe">Installer</a></li>
  <li><a href="/cli/cli/archive/refs/tags/v1.zip">Source code (zip)</a></li>
  <li><a href="/cli/cli/archive/refs/tags/v1.tar.gz">Source code (tar.gz)</a></li>
  <li><a href="https://evil.test/cli/cli/releases/download/v1/no.zip">External</a></li>
  <li><a href="/other/repo/releases/download/v1/no.zip">Other repo</a></li>
  <li><a href="javascript:alert(1)">Bad link</a></li>
  <li><a href="/cli/cli/attestations/123/download">Attestation</a></li>
</ul>`

test('extracts and deduplicates Assets, source archives and attestations with safe filenames', () => {
  const assets = parseAssets(fragment, 'https://github.com/cli/cli/releases/expanded_assets/v1')
  expect(assets.map(asset => asset.name)).toEqual(['app.zip', 'a b.exe', 'source-v1.zip', 'source-v1.tar.gz', 'attestation-123.json'])
  expect(assets.every(asset => asset.url.startsWith('https://github.com/cli/cli/'))).toBe(true)
  const unsafe = parseAssets('<a href="/cli/cli/releases/download/v1/..%2Fbad.exe">x</a>', 'https://github.com/cli/cli/releases/latest')
  expect(unsafe[0].name).toBe('.._bad.exe')
})

function response(html: string, url: string, status = 200) {
  const result = new Response(html, { status })
  Object.defineProperty(result, 'url', { value: url })
  return result
}

test('reads rounded sizes from the matching asset row without inventing archive sizes', () => {
  const html = `<ul>
    <li><a href="/cli/cli/releases/download/v1/app.zip"><span>app.zip</span></a><span> 12.4 MB </span></li>
    <li><a href="/cli/cli/releases/download/v1/empty.txt">empty.txt</a><span>0 Bytes</span></li>
    <li><a href="/cli/cli/archive/refs/tags/v1.zip">Source</a><span>2026-09-03</span></li>
  </ul>`
  const assets = parseAssets(html, 'https://github.com/cli/cli/releases/latest')
  expect(assets.map(asset => asset.sizeText)).toEqual(['12.4 MB', '0 Bytes', undefined])
  expect(releaseResource({ repository: 'cli/cli', url: '', assets }).files[0].size).toBe(0)
})

test('follows the lazy Assets fragment, not unrelated includes or release-note links', async () => {
  const fetcher = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(response(`<include-fragment src="https://evil.test/cli/cli/releases/expanded_assets/v1"></include-fragment>
      <include-fragment src="/cli/cli/releases/expanded_assets/v1"></include-fragment>
      <a href="/cli/cli/releases/download/old/old.zip">Release notes</a>`, 'https://github.com/cli/cli/releases/tag/v1'))
    .mockResolvedValueOnce(response(fragment, 'https://github.com/cli/cli/releases/expanded_assets/v1'))
  const release = await resolveRelease('cli/cli', fetcher)
  expect(fetcher.mock.calls.map(call => call[0])).toEqual([
    'https://github.com/cli/cli/releases/latest', 'https://github.com/cli/cli/releases/expanded_assets/v1',
  ])
  expect(release.assets).toHaveLength(5)
  expect(releaseResource(release).files[0]).toEqual({ name: 'app.zip', path: '', size: 0,
    req: { url: 'https://github.com/cli/cli/releases/download/v1/app.zip' } })
})

test('supports inline assets and reports empty, missing and restricted releases', async () => {
  expect((await resolveRelease('cli/cli', vi.fn().mockResolvedValue(new Response(fragment)))).assets).toHaveLength(5)
  await expect(resolveRelease('cli/cli', vi.fn().mockResolvedValue(new Response('<html></html>')))).rejects.toThrow('未找到 Assets')
  for (const status of [403, 404, 429, 500]) {
    await expect(resolveRelease('cli/cli', vi.fn().mockResolvedValue(new Response('', { status })))).rejects.toThrow(String(status))
  }
})

test('event shares the parser and leaves download links untouched', async () => {
  let handler!: (ctx: OnResolveContext) => Promise<void>
  vi.stubGlobal('xunlei', { events: { onResolve: (value: typeof handler) => { handler = value } } })
  const fetcher = vi.fn().mockResolvedValue(new Response(fragment))
  vi.stubGlobal('fetch', fetcher)
  await import('../src/events/onResolve')
  const direct: OnResolveContext = { req: { url: 'https://github.com/cli/cli/releases/download/v1/app.zip' } }
  await handler(direct)
  expect(direct.res).toBeUndefined()
  expect(fetcher).not.toHaveBeenCalled()
  const ctx: OnResolveContext = { req: { url: 'https://github.com/cli/cli/releases/latest' } }
  await handler(ctx)
  expect(ctx.res?.files).toHaveLength(5)
  expect(ctx.res?.files[0].req?.url).toContain('/releases/download/v1/app.zip')
})
