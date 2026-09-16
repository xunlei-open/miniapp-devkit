import { createHash } from 'node:crypto'
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve, sep, win32 } from 'node:path'
import type { MiniappManifest } from '@xunlei-open/miniapp-types'
import { minify, type Plugin, type ViteDevServer } from 'vite'
import { parse, parseFragment, serialize, type DefaultTreeAdapterMap } from 'parse5'

function localPath(root: string, file: string): string {
  const target = resolve(root, file)
  const rel = relative(root, target)
  if (isAbsolute(file) || win32.isAbsolute(file) || rel === '..' || rel.startsWith(`..${sep}`)) {
    throw new Error(`Miniapp development entry must stay inside its directory: ${file}`)
  }
  return target
}

export function localDevEntry(
  root: string,
  outDir: string,
  manifestFile: string,
  manifest: MiniappManifest,
) {
  const entry = manifest.entry?.url
  if (manifest.entry && (manifest.entry.type ?? 'miniapp') !== 'miniapp') {
    throw new Error('Local HMR requires a miniapp HTML entry')
  }
  const source = entry ? localPath(root, entry) : undefined
  const output = entry ? localPath(outDir, entry) : undefined
  const iconSource = manifest.icon ? localPath(root, manifest.icon) : undefined
  const iconOutput = manifest.icon ? localPath(outDir, manifest.icon) : undefined
  let iconUpdates = Promise.resolve()
  let stopped = false
  const rootFromOutput = relative(outDir, root)
  if (!rootFromOutput || (!rootFromOutput.startsWith(`..${sep}`) && rootFromOutput !== '..' && !isAbsolute(rootFromOutput))) {
    throw new Error('Development output must not be the project root or its parent')
  }
  let server: ViteDevServer
  let entryUrl: string | undefined
  let pagePath: string
  const inlineModules = new Map<string, string>()
  let clientCode: Promise<string> | undefined

  function loadClientCode() {
    return clientCode ??= readFile(new URL('./dev-client.js', import.meta.url), 'utf8')
      .then(code => minify('dev-client.js', code))
      .then(result => result.code.trim().replace(/<\/script/gi, '<\\/script'))
  }

  async function copyIcon() {
    if (!iconSource || !iconOutput) return
    await mkdir(dirname(iconOutput), { recursive: true })
    await copyFile(iconSource, iconOutput)
  }

  function onIconChange(event: string, file: string) {
    if (stopped || !iconSource || resolve(file) !== iconSource) return
    if (!['add', 'change', 'unlink'].includes(event)) return
    iconUpdates = iconUpdates.then(async () => {
      if (stopped) return
      if (event === 'unlink') await rm(iconOutput!, { force: true })
      else await copyIcon()
      server.config.logger.info('[miniapp] Manifest icon updated. Reload the application in the host to refresh its icon.')
    }).catch(error => {
      server.config.logger.error(`[miniapp] Icon sync failed: ${error instanceof Error ? error.message : String(error)}`)
    })
  }

  function rewriteEntry(html: string, bootstrap: string): string {
    const document = parse(html)
    const modules = new Map<string, string>()
    function visit(node: DefaultTreeAdapterMap['node']) {
      if ('tagName' in node) {
        for (const attr of node.attrs) {
          if (attr.name === 'src' || attr.name === 'poster' ||
            (attr.name === 'href' && ['link', 'image', 'use'].includes(node.tagName)) ||
            (attr.name === 'data' && node.tagName === 'object')) {
            if (attr.value && !attr.value.startsWith('#')) attr.value = new URL(attr.value, entryUrl).href
          }
        }
        if (node.tagName === 'script' &&
          node.attrs.some(attr => attr.name === 'type' && attr.value.toLowerCase() === 'module') &&
          !node.attrs.some(attr => attr.name === 'src')) {
          // Framework-injected preambles must resolve imports against HTTP, not file://.
          const code = node.childNodes.map(child => 'value' in child ? child.value : '').join('')
          const hash = createHash('sha256').update(code).digest('hex').slice(0, 16)
          const url = new URL(`./@miniapp-dev/inline-${modules.size}-${hash}.js`, entryUrl)
          const id = url.pathname.slice(server.config.base.length - 1)
          modules.set(id, code)
          node.childNodes = []
          node.attrs.push({ name: 'src', value: url.href })
        }
        if (node.tagName === 'script' &&
          node.attrs.some(attr => attr.name === 'type' && attr.value.toLowerCase() === 'module') &&
          node.attrs.some(attr => attr.name === 'src' && new URL(attr.value, entryUrl).origin === new URL(entryUrl!).origin)) {
          node.attrs.push({ name: 'data-miniapp-dev-module', value: '' })
          // Inert placeholders do not hold DOMContentLoaded or window.load open.
          node.attrs.find(attr => attr.name === 'type')!.value = 'application/x-miniapp-dev-module'
          node.attrs.find(attr => attr.name === 'src')!.name = 'data-miniapp-dev-src'
        }
      }
      if ('childNodes' in node) node.childNodes.forEach(visit)
      if ('content' in node) visit(node.content as DefaultTreeAdapterMap['documentFragment'])
    }
    visit(document)
    const htmlNode = document.childNodes.find(node => 'tagName' in node && node.tagName === 'html') as DefaultTreeAdapterMap['element']
    const head = htmlNode.childNodes.find(node => 'tagName' in node && node.tagName === 'head') as DefaultTreeAdapterMap['element']
    const script = parseFragment(`<script data-miniapp-dev-load-error>${bootstrap}</script>`).childNodes[0] as DefaultTreeAdapterMap['element']
    script.attrs.push({ name: 'data-miniapp-dev-probe', value: new URL(server.config.base, entryUrl).href })
    script.parentNode = head
    head.childNodes.unshift(script)
    inlineModules.clear()
    for (const [path, code] of modules) inlineModules.set(path, code)
    return serialize(document)
  }

  async function writeEntry() {
    if (!source || !output) return
    const html = await server.transformIndexHtml(pagePath, await readFile(source, 'utf8'))
    await mkdir(dirname(output), { recursive: true })
    await writeFile(output, `<!-- miniapp-dev-entry: run build before packaging -->\n${rewriteEntry(html, await loadClientCode())}`)
    // Remove only bootstrap files generated by the previous external-script version.
    const oldClient = resolve(dirname(output), 'miniapp-dev-client.js')
    const oldCode = await readFile(oldClient, 'utf8').catch(() => '')
    if (oldCode.startsWith('// Local development bootstrap: must work without the dev server.')) {
      await rm(oldClient, { force: true })
    }
  }

  const plugin: Plugin = {
    name: 'miniapp-local-dev-entry',
    apply: 'serve',
    async closeBundle() {
      stopped = true
      server?.watcher.off('all', onIconChange)
      await iconUpdates
    },
    resolveId(id) {
      if (inlineModules.has(id.split('?')[0]!)) return id
    },
    load(id) {
      return inlineModules.get(id.split('?')[0]!)
    },
    async handleHotUpdate(context) {
      if (resolve(context.file) !== source) return
      await writeEntry()
      // Vite's HTML reload filter otherwise compares against the file:// pathname.
      context.server.ws.send({ type: 'full-reload', path: '*' })
      return []
    },
  }

  return {
    plugin,
    async write(devServer: ViteDevServer) {
      server = devServer
      await mkdir(outDir, { recursive: true })
      if (entry) {
        const url = server.resolvedUrls?.local[0] ?? server.resolvedUrls?.network[0]
        if (!url) throw new Error('Cannot determine the Vite development server URL')
        server.config.server.origin ??= new URL(url).origin
        entryUrl = new URL(entry.replaceAll('\\', '/'), url).href
        pagePath = new URL(entryUrl).pathname
        await writeEntry()
      }
      await copyFile(resolve(root, manifestFile), resolve(outDir, 'manifest.json'))
      await copyIcon()
      if (iconSource) {
        server.watcher.add(iconSource)
        server.watcher.on('all', onIconChange)
      }
    },
  }
}
