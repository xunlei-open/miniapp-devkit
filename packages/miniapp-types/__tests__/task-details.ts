import type {
  OnResolveContext,
  Task,
  TaskCreateGroupInput,
  TaskCreateInput,
  TaskGroup,
  TaskStats,
  XunleiTasks,
} from '../src/index'

export function checkTaskDetails(task: Task, group: TaskGroup, ctx: OnResolveContext) {
  // @ts-expect-error Task details do not return request extras.
  task.meta.req.extra
  // @ts-expect-error Task details do not return download extras.
  task.meta.opts.extra
  // @ts-expect-error Group children use the same task detail metadata.
  group.children[0]!.meta.req.extra
  // @ts-expect-error Group children use the same task detail metadata.
  group.children[0]!.meta.opts.extra

  const input: TaskCreateInput = {
    req: { url: task.meta.req.url, extra: { header: { Referer: 'https://example.com' } } },
    opts: { path: task.meta.opts.path, extra: { connections: 4 } },
  }
  const groupInput: TaskCreateGroupInput = { name: 'downloads', tasks: [input], opts: input.opts }
  ctx.res = { files: [{ name: 'app.zip', path: '', size: 0, req: input.req }] }
  ctx.req.extra
  return groupInput
}

export async function checkTaskStats(tasks: XunleiTasks, id: string) {
  const detail = await tasks.detail({ id })
  const result: TaskStats = detail.stats
  const sizes: number[] = [result.originSize, result.p2pSize, result.p2sSize, result.vipSize]
  if (detail.type === 'group') {
    const childStats: TaskStats | undefined = detail.children[0]?.stats
  }

  return sizes
}

export function checkBackgroundTaskInput(req: TaskCreateInput['req']) {
  const inputs: TaskCreateInput[] = [
    { req },
    { req, opts: {} },
    { req, opts: { background: true, path: 'downloads', extra: { connections: 4 } } },
    { req, opts: { background: false } },
  ]
  // @ts-expect-error 后台任务选项只接受布尔值。
  inputs.push({ req, opts: { background: 'true' } })
  return inputs
}
