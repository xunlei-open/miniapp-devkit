import { load } from 'cheerio/slim'
import type { OnResolveResource } from '@xunlei-open/miniapp-types'

export interface Asset { name: string; url: string; sizeText?: string }
export interface Release { repository: string; url: string; assets: Asset[] }

/** Accept repository URLs, /releases[/latest], or owner/repo; never intercept asset URLs. */
export function repositoryUrl(input: string): string {
  const value = input.trim()
  const url = new URL(/^https?:\/\//i.test(value) ? value : `https://github.com/${value}`)
  if (url.origin !== 'https://github.com' || url.username || url.password) {
    throw new Error('请输入 https://github.com/作者/仓库 或 作者/仓库')
  }
  const match = url.pathname.match(/^\/([A-Za-z0-9-]+)\/([A-Za-z0-9_.-]+)(?:\/releases(?:\/latest)?)?\/?$/)
  if (!match || /^\.+$/.test(match[2])) throw new Error('请输入仓库地址或 releases/latest 地址，不是文件或指定版本地址')
  const repo = match[2].replace(/\.git$/, '')
  if (!repo || /^\.+$/.test(repo)) throw new Error('仓库名称无效')
  return `https://github.com/${match[1]}/${repo}`
}

function githubUrl(href: string, base: string): URL | undefined {
  try {
    const url = new URL(href, base)
    if (url.origin === 'https://github.com' && !url.username && !url.password) return url
  } catch { /* Ignore malformed links in remote HTML. */ }
}

function safeName(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/[. ]+$/, '') || 'download'
}

/** DOM parsing only: no browser DOM or Node.js APIs, shared with the event sandbox. */
export function parseAssets(html: string, base: string): Asset[] {
  const $ = load(html)
  const repoPath = new URL(base).pathname.split('/').slice(0, 3).join('/')
  const assets = new Map<string, Asset>()
  const names = new Set<string>()
  $('a[href]').each((_, element) => {
    const url = githubUrl($(element).attr('href')!, base)
    if (!url) return
    const path = url.pathname
    const archive = path.startsWith(`${repoPath}/archive/`)
    const attestation = path.startsWith(`${repoPath}/attestations/`) && path.endsWith('/download')
    if (!path.startsWith(`${repoPath}/releases/download/`) && !archive && !attestation) return
    url.hash = ''
    if (assets.has(url.href)) return
    let filename: string
    try { filename = decodeURIComponent(path.split('/').pop()!) } catch { return }
    if (archive) filename = `source-${filename}`
    if (attestation) filename = `attestation-${path.split('/').at(-2)}.json`
    filename = safeName(filename)
    const original = filename
    let suffix = 2
    while (names.has(filename.toLowerCase())) filename = `${suffix++}-${original}`
    names.add(filename.toLowerCase())
    // GitHub displays rounded sizes; keep the label without treating it as exact bytes.
    const sizeText = $(element).closest('li').find('span').toArray()
      .filter(span => !$(span).closest('a').length)
      .map(span => $(span).text().replace(/\s+/g, ' ').trim())
      .find(text => /^\d+(?:[.,]\d+)*\s*(?:[KMGTPE]i?B|B|Bytes?)$/i.test(text))
    assets.set(url.href, { name: filename, url: url.href, ...(sizeText ? { sizeText } : {}) })
  })
  return [...assets.values()]
}

export async function resolveRelease(input: string, fetcher: typeof fetch = fetch): Promise<Release> {
  const repository = repositoryUrl(input)
  async function getHtml(url: string) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20000)
    try {
      const response = await fetcher(url, {
        headers: { Accept: 'text/html' }, signal: controller.signal, credentials: 'omit',
      })
      if (!response.ok) throw new Error(`GitHub 请求失败（${response.status}）：仓库可能没有 Release、非公开或访问受限`)
      const finalUrl = githubUrl(response.url || url, url)
      if (!finalUrl) throw new Error('GitHub 返回了非预期的跳转地址')
      return { html: await response.text(), url: finalUrl.href }
    } finally { clearTimeout(timeout) }
  }
  const page = await getHtml(`${repository}/releases/latest`)
  const $ = load(page.html)
  const repoPath = new URL(page.url).pathname.split('/').slice(0, 3).join('/')
  const fragment = $('include-fragment[src]').toArray()
    .map(element => githubUrl($(element).attr('src')!, page.url))
    .find(url => url?.pathname.startsWith(`${repoPath}/releases/expanded_assets/`))
  // GitHub lazily loads the complete Assets list as a separate HTML fragment.
  const assetPage = fragment ? await getHtml(fragment.href) : page
  const assets = parseAssets(assetPage.html, assetPage.url)
  if (!assets.length) throw new Error('未找到 Assets 下载链接，可能尚未发布资源，或 GitHub 页面结构已变化')
  return { repository: repoPath.slice(1), url: page.url, assets }
}

export function releaseResource(release: Release): OnResolveResource {
  return {
    name: release.repository.replace('/', '-'), size: 0,
    files: release.assets.map(asset => ({
      name: asset.name, path: '', size: 0, req: { url: asset.url },
    })),
  }
}
