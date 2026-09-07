import './style.css'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <main>
    <p class="eyebrow">Xunlei Miniapp</p>
    <h1>basic-miniapp</h1>
    <p class="intro">输入下载地址，通过迅雷微应用 API 创建下载任务。</p>

    <form id="task-form">
      <label for="task-url">下载地址</label>
      <div class="row">
        <input id="task-url" type="url" value="https://example.com/file.zip" required />
        <button type="submit">创建任务</button>
      </div>
    </form>

    <output id="result">等待创建任务</output>
  </main>
`

const form = requireElement<HTMLFormElement>('#task-form')
const input = requireElement<HTMLInputElement>('#task-url')
const result = requireElement<HTMLOutputElement>('#result')
const button = requireElement<HTMLButtonElement>('button[type="submit"]')

form.addEventListener('submit', async (event) => {
  event.preventDefault()

  if (typeof xunlei === 'undefined') {
    result.textContent = '当前是普通浏览器预览，请在迅雷微应用宿主中创建任务。'
    return
  }

  button.disabled = true
  result.textContent = '正在创建任务…'

  try {
    const task = await xunlei.tasks.create({
      req: { url: input.value },
      opts: { name: 'basic-miniapp' },
    })
    result.textContent = `任务已创建：${task.id}`
  } catch (error) {
    result.textContent = error instanceof Error ? error.message : String(error)
  } finally {
    button.disabled = false
  }
})

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector)
  if (!element) throw new Error(`Missing element: ${selector}`)
  return element
}
