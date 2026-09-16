// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import App from '../src/App'
import { resolveRelease } from '../src/release'

vi.mock('../src/release', () => ({ resolveRelease: vi.fn() }))
afterEach(() => { cleanup(); vi.resetAllMocks(); vi.unstubAllGlobals() })

const assets = [
  { name: 'app.zip', url: 'https://github.com/cli/cli/releases/download/v1/app.zip', sizeText: '12.4 MB' },
  { name: 'app.exe', url: 'https://github.com/cli/cli/releases/download/v1/app.exe' },
]

async function resolve() {
  vi.mocked(resolveRelease).mockResolvedValue({ repository: 'cli/cli', url: 'https://github.com/cli/cli/releases/tag/v1', assets })
  render(<App />)
  fireEvent.change(screen.getByLabelText('GitHub 仓库'), { target: { value: 'cli/cli' } })
  fireEvent.click(screen.getByText('解析最新发布'))
  await screen.findByText('app.zip')
}

test('React page resolves input and downloads only checked assets', async () => {
  const createGroup = vi.fn().mockResolvedValue({ id: 'group-1' })
  vi.stubGlobal('xunlei', { tasks: { createGroup } })
  await resolve()
  expect(resolveRelease).toHaveBeenCalledWith('cli/cli')
  expect(screen.getByText('12.4 MB')).toBeTruthy()
  expect(screen.getByText('大小未知')).toBeTruthy()
  expect((screen.getByText('下载所选') as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(screen.getByLabelText('app.zip'))
  fireEvent.click(screen.getByText('下载所选'))
  await waitFor(() => expect(screen.getByRole('status').textContent).toContain('已创建任务组，包含 1 个文件'))
  expect(createGroup).toHaveBeenCalledExactlyOnceWith({ name: 'cli-cli', tasks: [{ req: { url: assets[0].url } }] })
  expect((screen.getByLabelText('app.zip') as HTMLInputElement).checked).toBe(false)
})

test('group creation failure retains all selections and retry submits one group', async () => {
  const createGroup = vi.fn().mockRejectedValueOnce(new Error('网络错误')).mockResolvedValueOnce({ id: 'group-1' })
  vi.stubGlobal('xunlei', { tasks: { createGroup } })
  await resolve()
  fireEvent.click(screen.getByLabelText('全选'))
  fireEvent.click(screen.getByText('下载所选'))
  await waitFor(() => expect(screen.getByRole('status').textContent).toContain('任务组创建失败'))
  expect((screen.getByLabelText('app.zip') as HTMLInputElement).checked).toBe(true)
  expect((screen.getByLabelText('app.exe') as HTMLInputElement).checked).toBe(true)
  fireEvent.click(screen.getByText('下载所选'))
  await waitFor(() => expect(createGroup).toHaveBeenCalledTimes(2))
  expect(createGroup.mock.calls[0][0]).toEqual({ name: 'cli-cli', tasks: assets.map(asset => ({ req: { url: asset.url } })) })
  expect(createGroup.mock.calls[1][0]).toEqual(createGroup.mock.calls[0][0])
  await waitFor(() => expect((screen.getByLabelText('app.exe') as HTMLInputElement).checked).toBe(false))
  expect((screen.getByLabelText('app.zip') as HTMLInputElement).checked).toBe(false)
  expect((screen.getByText('下载所选') as HTMLButtonElement).disabled).toBe(true)
})

test('shows parse errors without stale results', async () => {
  await resolve()
  vi.mocked(resolveRelease).mockRejectedValue(new Error('GitHub 请求失败（404）'))
  fireEvent.click(screen.getByText('解析最新发布'))
  await waitFor(() => expect(screen.getByRole('status').textContent).toContain('404'))
  expect(screen.queryByText('app.zip')).toBeNull()
})
