import './style.css'

const form = requireElement<HTMLFormElement>('#task-form')
const input = requireElement<HTMLInputElement>('#task-url')
const result = requireElement<HTMLOutputElement>('#result')

form.addEventListener('submit', async (event) => {
  event.preventDefault()

  if (typeof xunlei === 'undefined') {
    result.textContent = '当前是普通浏览器预览；请在迅雷微应用宿主中调用任务 API。'
    return
  }

  try {
    const task = await xunlei.tasks.create({
      req: { url: input.value },
      opts: { name: '基础示例下载' },
    })
    result.textContent = `任务已创建：${task.id}`
  } catch (error) {
    result.textContent = error instanceof Error ? error.message : String(error)
  }
})

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector)
  if (!element) throw new Error(`Missing element: ${selector}`)
  return element
}
