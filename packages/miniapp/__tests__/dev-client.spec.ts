import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import { afterEach, expect, test, vi } from 'vitest'

afterEach(() => vi.useRealTimers())

async function client(bodyReady = true) {
  vi.useFakeTimers()
  const listeners = new Map<string, () => void>()
  const appendChild = vi.fn()
  const scriptListeners = new Map<string, () => void>()
  const placeholder = {
    attributes: [],
    getAttribute: () => 'http://localhost:5173/main.ts',
    replaceWith: vi.fn(),
  }
  const document = {
    currentScript: { getAttribute: () => 'http://localhost:5173/app/' },
    body: bodyReady ? { appendChild } : (null as null | { appendChild: typeof appendChild }),
    querySelectorAll: () => [placeholder],
    createElement: vi.fn(() => ({
      setAttribute: vi.fn(),
      style: {},
      appendChild: vi.fn(),
      addEventListener: (name: string, callback: () => void) => scriptListeners.set(name, callback),
    })),
    addEventListener: (name: string, callback: () => void) => listeners.set(name, callback),
  }
  const reload = vi.fn()
  const fetch = vi.fn().mockResolvedValue({ status: 204 })
  runInNewContext(await readFile(new URL('../src/dev-client.js', import.meta.url), 'utf8'), {
    document,
    window: { location: { reload }, addEventListener: document.addEventListener },
    fetch,
    AbortController,
    setTimeout,
    setInterval,
    clearInterval,
  })
  expect(fetch).not.toHaveBeenCalled()
  listeners.get('load')!()
  await vi.advanceTimersByTimeAsync(0)
  return { fetch, reload, document, appendChild, listeners, scriptListeners }
}

test('a loaded page silently monitors disconnection and reloads once the server restarts', async () => {
  const c = await client()
  c.scriptListeners.get('load')!()
  await vi.advanceTimersByTimeAsync(3000)
  expect(c.fetch).toHaveBeenCalledTimes(4)
  expect(c.reload).not.toHaveBeenCalled()
  c.fetch.mockRejectedValue(new TypeError('offline'))
  await vi.advanceTimersByTimeAsync(10000)
  expect(c.fetch).toHaveBeenCalledTimes(14)
  expect(c.appendChild).not.toHaveBeenCalled()
  expect(c.reload).not.toHaveBeenCalled()
  c.fetch.mockResolvedValue({ status: 500 })
  await vi.advanceTimersByTimeAsync(1000)
  expect(c.reload).not.toHaveBeenCalled()
  c.fetch.mockResolvedValue({ status: 204 })
  await vi.advanceTimersByTimeAsync(1000)
  expect(c.reload).toHaveBeenCalledTimes(1)
  const attempts = c.fetch.mock.calls.length
  await vi.advanceTimersByTimeAsync(5000)
  expect(c.fetch).toHaveBeenCalledTimes(attempts)
  expect(c.reload).toHaveBeenCalledTimes(1)
  expect(c.appendChild).not.toHaveBeenCalled()
  expect(vi.getTimerCount()).toBe(0)
})

test('a module error with a reachable server does not start ongoing recovery', async () => {
  const c = await client()
  c.scriptListeners.get('error')!()
  await vi.advanceTimersByTimeAsync(10000)
  expect(c.fetch).toHaveBeenCalledTimes(1)
  expect(c.appendChild).not.toHaveBeenCalled()
  expect(c.reload).not.toHaveBeenCalled()
  expect(vi.getTimerCount()).toBe(0)
})

test('a stalled background probe is aborted silently and cannot trigger a stale reload', async () => {
  const c = await client()
  let resolve!: (value: { status: number }) => void
  c.fetch.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done
      }),
  )
  c.scriptListeners.get('load')!()
  const signal = c.fetch.mock.calls[0]![1].signal as AbortSignal
  c.fetch.mockRejectedValue(new TypeError('offline'))
  await vi.advanceTimersByTimeAsync(1000)
  expect(signal.aborted).toBe(true)
  resolve({ status: 204 })
  await vi.advanceTimersByTimeAsync(0)
  expect(c.reload).not.toHaveBeenCalled()
  expect(c.appendChild).not.toHaveBeenCalled()
  c.fetch.mockResolvedValue({ status: 204 })
  await vi.advanceTimersByTimeAsync(1000)
  expect(c.reload).toHaveBeenCalledTimes(1)
  expect(c.appendChild).not.toHaveBeenCalled()
  expect(vi.getTimerCount()).toBe(0)
})

test('recovers when initially offline and waits for body before showing the notice', async () => {
  const c = await client(false)
  c.fetch.mockRejectedValue(new TypeError('offline'))
  c.scriptListeners.get('error')!()
  await vi.advanceTimersByTimeAsync(0)
  expect(c.appendChild).not.toHaveBeenCalled()
  c.document.body = { appendChild: c.appendChild }
  c.listeners.get('DOMContentLoaded')!()
  expect(c.appendChild).toHaveBeenCalledTimes(1)
  await vi.advanceTimersByTimeAsync(999)
  expect(c.fetch).toHaveBeenCalledTimes(1)
  c.fetch.mockResolvedValue({ status: 500 })
  await vi.advanceTimersByTimeAsync(1)
  expect(c.reload).not.toHaveBeenCalled()
  c.fetch.mockResolvedValue({ status: 204 })
  await vi.advanceTimersByTimeAsync(1000)
  expect(c.reload).toHaveBeenCalledTimes(1)
  const attempts = c.fetch.mock.calls.length
  await vi.advanceTimersByTimeAsync(5000)
  expect(c.fetch).toHaveBeenCalledTimes(attempts)
  expect(c.reload).toHaveBeenCalledTimes(1)
})

test('aborts stalled probes and ignores their late results', async () => {
  const c = await client()
  let resolve!: (value: { status: number }) => void
  c.fetch.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done
      }),
  )
  c.scriptListeners.get('error')!()
  await vi.advanceTimersByTimeAsync(0)
  const signal = c.fetch.mock.calls[0]![1].signal as AbortSignal
  c.fetch.mockRejectedValue(new TypeError('offline'))
  await vi.advanceTimersByTimeAsync(1000)
  expect(signal.aborted).toBe(true)
  resolve({ status: 204 })
  await vi.advanceTimersByTimeAsync(0)
  expect(c.reload).not.toHaveBeenCalled()
  c.fetch.mockResolvedValue({ status: 204 })
  await vi.advanceTimersByTimeAsync(1000)
  expect(c.reload).toHaveBeenCalledTimes(1)
  const attempts = c.fetch.mock.calls.length
  await vi.advanceTimersByTimeAsync(5000)
  expect(c.fetch).toHaveBeenCalledTimes(attempts)
  expect(c.reload).toHaveBeenCalledTimes(1)
})
