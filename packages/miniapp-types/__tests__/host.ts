import type { UiPlayOptions, XunleiHostEnv, XunleiHostUi } from '../src/index'

export function checkHostApis(env: XunleiHostEnv, ui: XunleiHostUi) {
  const version: Promise<string> = env.version()
  const input: UiPlayOptions = { taskId: 'task-id', index: 0 }
  const play: Promise<void> = ui.play(input)
  const globalVersion: Promise<string> = xunlei.host.env.version()
  const globalPlay: Promise<void> = xunlei.host.ui.play(input)
  // @ts-expect-error Playback requires options with a task ID.
  ui.play()
  const taskOnlyInput: UiPlayOptions = { taskId: 'task-id' }
  const taskOnlyPlay: Promise<void> = ui.play(taskOnlyInput)
  const globalTaskOnlyPlay: Promise<void> = xunlei.host.ui.play({ taskId: 'task-id' })
  // @ts-expect-error Playback requires a task ID.
  ui.play({ index: 0 })
  // @ts-expect-error File index must be a number.
  ui.play({ taskId: 'task-id', index: '0' })
  // @ts-expect-error Task ID must be a string.
  ui.play({ taskId: 1, index: 0 })
  return { version, play, globalVersion, globalPlay, taskOnlyPlay, globalTaskOnlyPlay }
}
