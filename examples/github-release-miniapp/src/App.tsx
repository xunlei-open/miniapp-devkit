import { useRef, useState, type FormEvent } from 'react'
import { resolveRelease, type Release } from './release'

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

export default function App() {
  const [input, setInput] = useState('')
  const [release, setRelease] = useState<Release>()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('支持仓库地址、作者/repo，以及 releases/latest 地址。')
  const pending = useRef(false)

  async function resolve(event: FormEvent) {
    event.preventDefault()
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setRelease(undefined)
    setSelected(new Set())
    setMessage('正在读取 latest Release 和 Assets…')
    try {
      const result = await resolveRelease(input)
      setRelease(result)
      setMessage(`找到 ${result.assets.length} 个文件，请选择需要下载的资源。`)
    } catch (error) {
      setMessage(`${errorMessage(error)}。请检查网络并在迅雷宿主中重试。`)
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  async function download() {
    if (pending.current || !release || !selected.size) return
    if (typeof xunlei === 'undefined') {
      setMessage('请在迅雷微应用宿主中创建下载任务。')
      return
    }
    pending.current = true
    setBusy(true)
    const assets = release.assets.filter((asset) => selected.has(asset.url))
    setMessage('正在创建下载任务组…')
    try {
      await xunlei.tasks.createGroup({
        name: release.repository.replaceAll('/', '-'),
        tasks: assets.map((asset) => ({ req: { url: asset.url } })),
      })
      setSelected(new Set())
      setMessage(`已创建任务组，包含 ${assets.length} 个文件。`)
    } catch (error) {
      setMessage(`任务组创建失败，已保留勾选，可重试。${errorMessage(error)}`)
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  return (
    <main>
      <header>
        <p className="eyebrow">GITHUB RELEASE</p>
        <h1>找到发布，选择下载。</h1>
        <p>输入公开仓库地址，获取最新 Release 的全部 Assets。</p>
      </header>
      <form onSubmit={resolve}>
        <label htmlFor="repository">GitHub 仓库</label>
        <div className="input-row">
          <input
            id="repository"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="cli/cli 或 https://github.com/cli/cli"
            required
            disabled={busy}
          />
          <button type="submit" disabled={busy}>
            解析最新发布
          </button>
        </div>
      </form>
      <p id="status" role="status" aria-live="polite">
        {message}
      </p>
      {release && (
        <section aria-label="Release Assets">
          <div className="toolbar">
            <label>
              <input
                type="checkbox"
                disabled={busy}
                checked={selected.size === release.assets.length}
                ref={(element) => {
                  if (element) element.indeterminate = selected.size > 0 && selected.size < release.assets.length
                }}
                onChange={(event) =>
                  setSelected(new Set(event.target.checked ? release.assets.map((asset) => asset.url) : []))
                }
              />{' '}
              全选
            </label>
            <h2>{release.repository}</h2>
          </div>
          <ul>
            {release.assets.map((asset) => (
              <li key={asset.url}>
                <label>
                  <input
                    type="checkbox"
                    aria-label={asset.name}
                    disabled={busy}
                    checked={selected.has(asset.url)}
                    onChange={(event) => {
                      const next = new Set(selected)
                      if (event.target.checked) next.add(asset.url)
                      else next.delete(asset.url)
                      setSelected(next)
                    }}
                  />
                  <span className="asset-name">{asset.name}</span>
                  <span className="asset-size">{asset.sizeText ?? '大小未知'}</span>
                </label>
              </li>
            ))}
          </ul>
          <footer>
            <span>
              已选择 {selected.size} / {release.assets.length} 个文件
            </span>
            <button type="button" disabled={busy || !selected.size} onClick={download}>
              下载所选
            </button>
          </footer>
        </section>
      )}
      <p className="hint">下载需要在迅雷微应用宿主中进行。源码压缩包也会列出；默认不勾选任何文件。</p>
    </main>
  )
}
