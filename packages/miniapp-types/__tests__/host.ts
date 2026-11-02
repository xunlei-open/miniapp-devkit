import type { TaskPlayOptions, UrlPlayOptions, XunleiHostEnv, XunleiHostPlayer, XunleiHostUi } from '../src/index'

/** 检查宿主播放器支持任务和资源链接播放，返回 Promise<void>。 */
export function checkHostApis(env: XunleiHostEnv, ui: XunleiHostUi, player: XunleiHostPlayer) {
  const version: Promise<string> = env.version()
  const input: TaskPlayOptions = { source: 'task', taskId: 'task-id', fileIndex: 0 }
  const play: Promise<void> = player.play(input)
  const globalVersion: Promise<string> = xunlei.host.env.version()
  const globalPlay: Promise<void> = xunlei.host.player.play(input)
  const taskOnlyInput: TaskPlayOptions = { source: 'task', taskId: 'task-id' }
  const taskOnlyPlay: Promise<void> = player.play(taskOnlyInput)
  const globalTaskOnlyPlay: Promise<void> = xunlei.host.player.play(taskOnlyInput)
  const urlInput: UrlPlayOptions = { source: 'url', url: 'https://example.com/video.mp4' }
  const urlPlay: Promise<void> = player.play(urlInput)
  const globalUrlPlay: Promise<void> = xunlei.host.player.play({
    ...urlInput,
    name: '示例视频',
    addToLinkHistory: true,
  })
  // @ts-expect-error 宿主 UI 接口不提供播放方法。
  ui.play(input)
  // @ts-expect-error 全局宿主 UI 接口不提供播放方法。
  xunlei.host.ui.play(input)
  return {
    version,
    play,
    globalVersion,
    globalPlay,
    taskOnlyPlay,
    globalTaskOnlyPlay,
    urlPlay,
    globalUrlPlay,
  }
}

/** 检查播放来源、必填字段及任务与链接参数不能混用。 */
export function checkInvalidPlaybackOptions(player: XunleiHostPlayer) {
  // @ts-expect-error 播放参数必填。
  player.play()
  // @ts-expect-error 必须显式指定来源。
  player.play({ taskId: 'task-id' })
  // @ts-expect-error 不支持其他播放来源。
  player.play({ source: 'file', url: 'https://example.com/video.mp4' })
  // @ts-expect-error 任务来源必须提供任务 ID。
  player.play({ source: 'task', fileIndex: 0 })
  // @ts-expect-error 文件下标必须是数字。
  player.play({ source: 'task', taskId: 'task-id', fileIndex: '0' })
  // @ts-expect-error 任务 ID 必须是字符串。
  player.play({ source: 'task', taskId: 1 })
  // @ts-expect-error 任务文件参数使用 fileIndex。
  player.play({ source: 'task', taskId: 'task-id', index: 0 })
  // @ts-expect-error 任务来源不接受 URL。
  player.play({ source: 'task', taskId: 'task-id', url: 'https://example.com/video.mp4' })
  // @ts-expect-error 链接历史选项仅用于 URL 来源。
  player.play({ source: 'task', taskId: 'task-id', addToLinkHistory: true })
  // @ts-expect-error URL 来源必须提供资源链接。
  player.play({ source: 'url' })
  // @ts-expect-error URL 必须是字符串。
  player.play({ source: 'url', url: 1 })
  // @ts-expect-error URL 来源不接受任务 ID。
  player.play({ source: 'url', url: 'https://example.com/video.mp4', taskId: 'task-id' })
  // @ts-expect-error URL 来源不接受任务文件下标。
  player.play({ source: 'url', url: 'https://example.com/video.mp4', fileIndex: 0 })
  // @ts-expect-error 链接历史选项必须是布尔值。
  player.play({ source: 'url', url: 'https://example.com/video.mp4', addToLinkHistory: 'true' })
}
