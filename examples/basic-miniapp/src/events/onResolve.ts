xunlei.events.onResolve((ctx) => {
  xunlei.logger.info('[basic-miniapp] resolving', ctx.req.url)

  ctx.res = {
    name: 'github-resource',
    size: 0,
    range: false,
    files: [
      {
        name: 'github-resource.html',
        path: 'github-resource.html',
        size: 0,
        req: { url: ctx.req.url },
      },
    ],
  }
})
