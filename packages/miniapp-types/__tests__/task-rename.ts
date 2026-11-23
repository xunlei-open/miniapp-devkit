import type { MiniappPermission, Task, TaskDetailResult, TaskRenameInput, XunleiTasks } from '../src/index'

/** 更名共用修改任务权限，任务组结果必须经过类型收窄后访问子任务。 */
export async function checkTaskRename(tasks: XunleiTasks, id: string) {
  const permission: MiniappPermission = 'tasks.update'
  const input: TaskRenameInput = { id, name: '第一课.mp4' }
  const detail: TaskDetailResult = await tasks.rename(input)
  const children: Task[] = detail.type === 'group' ? detail.children : []
  // @ts-expect-error 更名必须提供新名称。
  tasks.rename({ id })
  // @ts-expect-error 本接口不处理 BT 子文件更名。
  tasks.rename({ id, name: '文件.mp4', fileIndex: 0 })
  return { permission, detail, children }
}
