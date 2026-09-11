import type { OnResolveContext, Task, TaskCreateGroupInput, TaskCreateInput, TaskGroup } from '../src/index'

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
  const groupInput: TaskCreateGroupInput = { name: 'downloads', reqs: [input.req], opts: input.opts }
  ctx.res = { files: [{ name: 'app.zip', path: '', size: 0, req: input.req }] }
  ctx.req.extra
  return groupInput
}
