import type { MiniappPermission, Task, TaskDetailResult, TaskMoveInput, XunleiTasks } from '../src/index'

/** 移动共用修改任务权限，返回值须区分任务与任务组。 */
export async function checkTaskMove(tasks: XunleiTasks, id: string) {
  const permission: MiniappPermission = 'tasks.update'
  const input: TaskMoveInput = { id, path: 'E:\\下载归档' }
  const detail: TaskDetailResult = await tasks.move(input)
  const children: Task[] = detail.type === 'group' ? detail.children : []
  // @ts-expect-error 移动必须提供目标目录。
  tasks.move({ id })
  // @ts-expect-error 本接口不处理 BT 子文件移动。
  tasks.move({ id, path: 'E:\\下载归档', fileIndex: 0 })
  return { permission, detail, children }
}
