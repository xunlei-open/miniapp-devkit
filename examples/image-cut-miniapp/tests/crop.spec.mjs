import { test, expect } from "@playwright/test";

async function upload(page) {
  const data = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 800;
    c.height = 600;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#e94f35";
    ctx.fillRect(0, 0, 400, 600);
    ctx.fillStyle = "#244ee9";
    ctx.fillRect(400, 0, 400, 600);
    return c.toDataURL().split(",")[1];
  });
  await page.locator("#file").setInputFiles({
    name: "测试图片.png",
    mimeType: "image/png",
    buffer: Buffer.from(data, "base64"),
  });
  await expect(page.locator("#w")).toHaveValue("800");
}

test("responsive layout, crop drag, ratios, keyboard and invalid input", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await upload(page);
  for (const width of [320, 390, 768, 849, 850, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
  await page.locator("#ratio").selectOption("1");
  await expect(page.locator("#w")).toHaveValue("600");
  await expect(page.locator("#x")).toHaveValue("100");
  await page.locator("#w").fill("200");
  await page.locator("#w").blur();
  await expect(page.locator("#h")).toHaveValue("200");
  await page.locator("#crop").focus();
  await page.keyboard.press("Shift+ArrowRight");
  await expect(page.locator("#x")).toHaveValue("110");
  const box = await page.locator("#crop").boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + 30,
    box.y + box.height / 2 + 20,
  );
  await page.mouse.up();
  expect(Number(await page.locator("#x").inputValue())).toBeGreaterThan(110);
  const handle = await page.locator(".se").boundingBox();
  await page.mouse.move(handle.x + 10, handle.y + 10);
  await page.mouse.down();
  await page.mouse.move(handle.x + 45, handle.y + 45);
  await page.mouse.up();
  expect(Number(await page.locator("#w").inputValue())).toBeGreaterThan(200);
  await page.locator("#x").fill("99999");
  await page.locator("#x").blur();
  expect(
    Number(await page.locator("#x").inputValue()) +
      Number(await page.locator("#w").inputValue()),
  ).toBe(800);
  await page.locator("#download").click();
  await expect(page.locator("#status")).toContainText("请在迅雷客户端");
  await page.screenshot({ path: "test-results/desktop.png", fullPage: true });
  await page.setViewportSize({ width: 320, height: 900 });
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
  await page.locator("#file").setInputFiles({
    name: "broken.png",
    mimeType: "image/png",
    buffer: Buffer.from("broken"),
  });
  await expect(page.locator("#status")).toHaveClass("error");
  await expect(page.locator("#download")).toBeEnabled();
  expect(errors).toEqual([]);
});

test("exports exact crop pixels via host Blob and task APIs; handles rejection", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.calls = [];
    window.failTask = false;
    window.xunlei = {
      runtime: {
        blob: {
          createObjectURL: async (blob) => {
            const image = await createImageBitmap(blob);
            const c = document.createElement("canvas");
            c.width = image.width;
            c.height = image.height;
            const ctx = c.getContext("2d");
            ctx.drawImage(image, 0, 0);
            window.calls.push({
              type: blob.type,
              width: image.width,
              height: image.height,
              pixel: Array.from(ctx.getImageData(0, 0, 1, 1).data),
            });
            return "http://127.0.0.1/mock-blob";
          },
          revokeObjectURL: async (url) => window.calls.push({ revoked: url }),
        },
      },
      tasks: {
        create: async (input) => {
          window.calls.push(input);
          if (window.failTask)
            throw { code: "DENIED", message: "模拟权限错误" };
          return { id: "test-task" };
        },
      },
    };
  });
  await page.goto("/");
  await upload(page);
  await page.locator("#w").fill("400");
  await page.locator("#w").blur();
  await page.locator("#x").fill("400");
  await page.locator("#x").blur();
  await page.locator("#download").click();
  await expect(page.locator("#status")).toContainText("已创建下载任务");
  const calls = await page.evaluate(() => window.calls);
  expect(calls[0]).toEqual({
    type: "image/png",
    width: 400,
    height: 600,
    pixel: [36, 78, 233, 255],
  });
  expect(calls[1]).toEqual({
    req: { url: "http://127.0.0.1/mock-blob" },
    opts: { name: "测试图片-裁剪.png" },
  });
  expect(calls).toHaveLength(2);
  await page.locator("#format").selectOption("image/jpeg");
  await page.locator("#download").click();
  await expect(page.locator("#status")).toContainText(".jpg");
  expect((await page.evaluate(() => window.calls))[2].type).toBe("image/jpeg");
  await page.evaluate(() => {
    window.failTask = true;
  });
  await page.locator("#download").click();
  await expect(page.locator("#status")).toContainText("模拟权限错误");
  expect((await page.evaluate(() => window.calls)).at(-1)).toEqual({
    revoked: "http://127.0.0.1/mock-blob",
  });
  await expect(page.locator("#download")).toBeEnabled();
});

test("compact desktop viewport keeps the main actions visible", async ({
  page,
}) => {
  await page.goto("/");
  for (const loaded of [false, true]) {
    if (loaded) await upload(page);
    for (const [width, height] of [
      [900, 700],
      [884, 620],
      [860, 600],
      [720, 600],
    ]) {
      await page.setViewportSize({ width, height });
      await expect
        .poll(() =>
          page.evaluate(() => ({
            x: document.documentElement.scrollWidth > innerWidth,
            y: document.documentElement.scrollHeight > innerHeight,
          })),
        )
        .toEqual({ x: false, y: false });
      const button = await page.locator("#download").boundingBox();
      expect(button.y + button.height).toBeLessThanOrEqual(height);
      if (height >= 620) {
        expect(
          await page
            .locator("#controls")
            .evaluate((el) => el.scrollHeight <= el.clientHeight),
        ).toBeTruthy();
      }
    }
  }
  await page.setViewportSize({ width: 900, height: 700 });
  await page.screenshot({ path: "test-results/window-900x700.png" });
  await page.setViewportSize({ width: 884, height: 620 });
  await page.screenshot({ path: "test-results/content-884x620.png" });
  await page.evaluate(() => {
    document.getElementById("status").textContent =
      "下载任务状态与长文件名。".repeat(100);
    document.getElementById("meta").textContent =
      "很长的文件名".repeat(100) + ".png";
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollHeight <= innerHeight,
    ),
  ).toBeTruthy();
  await page.setViewportSize({ width: 320, height: 700 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.locator("#download").scrollIntoViewIfNeeded();
  await expect(page.locator("#download")).toBeInViewport();
});
