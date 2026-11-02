import type { FileInfo, OnResolveContext, Request, Resource, Task, TaskFileStatus, TaskGroup } from '../src/index'

// Compile-time checks: download requests belong only to resolution results.
export function checkFileRequests(file: FileInfo, task: Task, group: TaskGroup, ctx: OnResolveContext) {
  // @ts-expect-error Task file metadata does not expose a download request.
  void file.req
  // @ts-expect-error Single-task details use plain file metadata.
  void task.meta.res.files[0]!.req
  // @ts-expect-error Group children use the same task file metadata.
  void group.children[0]!.meta.res.files[0]!.req
  const request: Request | undefined = ctx.res?.files[0]?.req
  ctx.res = { files: [{ name: 'app.zip', path: '', size: 0, req: { url: 'https://example.com/app.zip' } }] }
  return request
}

export function checkTaskFileDetails(task: Task, group: TaskGroup, resource: Resource, ctx: OnResolveContext) {
  const file: FileInfo = task.meta.res.files[0]!
  const download: boolean = file.download
  const status: TaskFileStatus = file.status
  const childFile: FileInfo = group.children[0]!.meta.res.files[0]!
  const statuses: TaskFileStatus[] = ['running', 'wait', 'error', 'done']
  // @ts-expect-error File status does not include ready.
  statuses.push('ready')
  // @ts-expect-error File status does not include pause.
  statuses.push('pause')
  const baseFile = { name: 'app.zip', path: '', size: 0 }
  // @ts-expect-error Task detail files require download and status.
  const missingDetails: FileInfo = baseFile
  // @ts-expect-error Download selection must be a boolean.
  const invalidDownload: FileInfo = { ...baseFile, download: 'true', status: 'wait' }
  const resourceFile: FileInfo = resource.files[0]!
  // @ts-expect-error Resolution files do not expose download selection.
  void ctx.res!.files[0]!.download
  // @ts-expect-error Resolution files do not expose download status.
  void ctx.res!.files[0]!.status
  return { download, status, childFile, resourceFile, statuses }
}
