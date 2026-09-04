xunlei.events.onResolve((ctx) => {
  ctx.res = {
    name: "example",
    size: 0,
    range: false,
    files: [
      {
        name: "index.html",
        path: "index.html",
        size: 0,
        req: {
          url: ctx.req.url,
        },
      },
    ],
  };
});
