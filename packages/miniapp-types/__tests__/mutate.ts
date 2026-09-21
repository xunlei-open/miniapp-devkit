import type { OnDoneContext, OnErrorContext, OnResolveContext, OnStartContext } from '../src/index'

export async function checkMutateError({ task }: OnErrorContext, newUrl: string, token: string) {
  if (task.type === 'group') {
    for (const child of task.children) {
      await child.meta.req.putHeader('Cookie', token)
      await child.continue()
    }
    await task.continue()
    // @ts-expect-error 任务组没有独立请求，必须修改子任务。
    task.meta.req
    return
  }
  const req = task.meta.req
  await req.setUrl(newUrl)
  await req.putHeader('Authorization', `Bearer ${token}`)
  await req.putLabel('retry', '1')
  await req.setHeaders({ Referer: newUrl })
  await req.delHeader('Authorization')
  await req.setHeaders({})
  await task.continue()

  const url: string = req.url
  // @ts-expect-error Error events do not expose extra, even after setting headers.
  req.extra?.header?.Authorization
  // @ts-expect-error Request data must be changed through methods.
  req.url = newUrl
  // @ts-expect-error Task request extras cannot be accessed or assigned.
  req.extra!.header!.Authorization = token
  // @ts-expect-error Labels must be changed through methods.
  req.labels!.retry = '2'
  // @ts-expect-error Request operations are mounted on meta.req.
  task.req
  // @ts-expect-error The former task-level mutation API is removed.
  task.setUrl(newUrl)
  // @ts-expect-error Wholesale extra replacement is removed.
  task.setExtra({})
  // @ts-expect-error Wholesale extra replacement is not moved onto the request.
  req.setExtra({})
  // @ts-expect-error HTTP method is outside the supported request fields.
  req.setMethod('POST')
  // @ts-expect-error HTTP body is outside the supported request fields.
  req.setBody('body')
  // @ts-expect-error Trackers are outside the supported request fields.
  req.setTrackers([])
  // @ts-expect-error Header names retain the existing supported fields.
  req.putHeader('X-Custom', 'value')
  return { url }
}

export async function checkMutateEvents(resolve: OnResolveContext, start: OnStartContext, done: OnDoneContext) {
  if (done.task.type === 'group') {
    for (const child of done.task.children) {
      const id: string = child.id
      // @ts-expect-error 完成事件的子任务没有请求修改方法。
      child.meta.req.setHeaders({ Cookie: id })
      // @ts-expect-error 完成事件的子任务不可恢复。
      child.continue()
    }
    // @ts-expect-error 完成事件的任务组不可恢复。
    done.task.continue()
    return
  }
  const initial: OnResolveContext = {
    req: { url: 'https://example.com', labels: { source: 'miniapp' }, extra: { header: { Authorization: 'token' } } },
  }
  const authorization: string | undefined = initial.req.extra?.header?.Authorization
  const resolveAuthorization: string | undefined = resolve.req.extra?.header?.Authorization
  // @ts-expect-error Resolve requests expose no mutation methods.
  await resolve.req.setLabels({ source: 'miniapp' })
  // @ts-expect-error Resolve requests expose no mutation methods.
  await resolve.req.putLabel('retry', '1')
  // @ts-expect-error Resolve requests expose no mutation methods.
  await resolve.req.delLabel('retry')
  resolve.res = { files: [{ req: initial.req }] }
  // @ts-expect-error Resolve requests expose no mutation methods.
  resolve.req.setUrl('https://example.com')
  await start.task.meta.req.setUrl(resolve.req.url)
  await start.task.meta.req.setLabels({ source: 'miniapp' })
  await start.task.meta.req.putLabel('retry', '1')
  await start.task.meta.req.delLabel('retry')
  await start.task.meta.req.putHeader('Authorization', 'token')
  // @ts-expect-error Start events do not expose request extras.
  start.task.meta.req.extra
  // @ts-expect-error Completed tasks do not expose request extras.
  done.task.meta.req.extra
  // @ts-expect-error Only an error task can continue.
  start.task.continue()
  // @ts-expect-error Completed tasks have no mutation methods.
  done.task.meta.req.setUrl(resolve.req.url)
  return { authorization, resolveAuthorization }
}
