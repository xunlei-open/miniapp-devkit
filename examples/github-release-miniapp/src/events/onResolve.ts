import { releaseResource, repositoryUrl, resolveRelease } from "../release";

xunlei.events.onResolve(async (ctx) => {
  // The host uses URL patterns; validate the exact path to avoid recursively resolving downloads.
  try {
    repositoryUrl(ctx.req.url);
  } catch {
    return;
  }
  ctx.res = releaseResource(await resolveRelease(ctx.req.url));
});
