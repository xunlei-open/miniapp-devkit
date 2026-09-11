import type { FileInfo, OnResolveContext, Request, Task, TaskGroup } from '../src/index'

// Compile-time checks: download requests belong only to resolution results.
export function checkFileRequests(file: FileInfo, task: Task, group: TaskGroup, ctx: OnResolveContext) {
  // @ts-expect-error Task file metadata does not expose a download request.
  file.req
  // @ts-expect-error Single-task details use plain file metadata.
  task.meta.res.files[0]!.req
  // @ts-expect-error Group children use the same task file metadata.
  group.children[0]!.meta.res.files[0]!.req
  const request: Request | undefined = ctx.res?.files[0]?.req
  ctx.res = { files: [{ name: 'app.zip', path: '', size: 0, req: { url: 'https://example.com/app.zip' } }] }
  return request
}
