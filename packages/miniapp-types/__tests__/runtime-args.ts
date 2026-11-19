import type { MiniappArgs, MiniappOpenArgs, XunleiRuntime } from '../src/index'

/** 检查初始参数可为空，任务来源分支能直接取得完整的任务文件信息。 */
export async function checkRuntimeArgs(runtime: XunleiRuntime) {
  const initial: MiniappArgs = await runtime.getArgs()
  const empty: MiniappArgs = {}
  if (initial.from === 'task') {
    const taskId: string = initial.taskId
    const fileIndex: number = initial.fileIndex
    void [taskId, fileIndex]
  }
  const unsubscribe: () => void = await runtime.onNewArgs(async (args) => {
    const task: MiniappOpenArgs = args
    void task
  })
  unsubscribe()
  const globalArgs: MiniappArgs = await xunlei.runtime.getArgs()
  return { initial, empty, globalArgs }
}

/** 检查任务参数完整、来源封闭，且不能再通过 runtime.args 读取。 */
export function checkInvalidRuntimeArgs(runtime: XunleiRuntime) {
  // @ts-expect-error 任务来源必须包含 fileIndex。
  const missingIndex: MiniappOpenArgs = { from: 'task', taskId: 'task-1' }
  // @ts-expect-error 任务来源必须包含 taskId。
  const missingTask: MiniappOpenArgs = { from: 'task', fileIndex: 0 }
  // @ts-expect-error 当前不支持其它来源。
  const otherSource: MiniappOpenArgs = { from: 'url', taskId: 'task-1', fileIndex: 0 }
  // @ts-expect-error 文件下标必须是数字。
  const stringIndex: MiniappOpenArgs = { from: 'task', taskId: 'task-1', fileIndex: '0' }
  // @ts-expect-error 参数不能省略来源。
  const missingSource: MiniappArgs = { taskId: 'task-1', fileIndex: 0 }
  // @ts-expect-error 初始参数通过异步方法读取。
  void runtime.args
  return { missingIndex, missingTask, otherSource, stringIndex, missingSource }
}
