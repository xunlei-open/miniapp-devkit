import "./style.css";

import { clamp, initialCrop, updateCrop, exportFilename, type Rect } from "./crop";
const $ = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
<header><div class="brand"><span class="logo">◩</span><span>迅雷图片裁剪<small>IMAGE CUT</small></span></div><span class="badge">本地处理 · 无需上传</span></header>
<main>
  <div class="workspace">
    <section class="editor panel" aria-label="图片裁剪编辑器">
      <div class="panel-title"><h2><span>01</span> 裁剪画面</h2><button id="choose" class="secondary">选择图片</button><input id="file" type="file" accept="image/png,image/jpeg,image/webp,image/bmp" hidden></div>
      <div id="drop" class="drop">
        <div id="empty"><div class="empty-icon">⊞</div><h3>把图片放进来</h3><p>拖放图片到这里，或点击上方「选择图片」</p><small>支持 JPG、PNG、WebP、BMP · 最大 30 MB</small></div>
        <div id="stage" hidden><img id="source" alt="待裁剪的原图" draggable="false"><div id="crop" tabindex="0" role="group" aria-label="裁剪区域，方向键移动，Shift 加速"><i class="grid vertical"></i><i class="grid horizontal"></i><span class="handle nw" data-corner="nw"></span><span class="handle ne" data-corner="ne"></span><span class="handle sw" data-corner="sw"></span><span class="handle se" data-corner="se"></span></div></div>
      </div>
      <div class="image-meta"><span id="meta">尚未选择图片</span><button id="reset" class="text-button" disabled>重置裁剪</button></div>
      <div class="preview-row"><div class="preview-block"><div class="preview-heading"><label>实时预览</label><span id="size">—</span></div><div class="preview"><canvas id="preview" width="1" height="1" aria-label="裁剪结果预览"></canvas><span id="preview-empty">裁剪结果将在这里显示</span></div></div><p class="hint">拖动选框移动，拖动四角调整大小。也可使用像素输入精确裁剪。</p></div>
    </section>
    <aside class="panel settings"><h2><span>02</span> 调整与导出</h2>
      <fieldset id="controls" disabled><legend>裁剪设置</legend>
      <label for="ratio">裁剪比例</label><select id="ratio"><option value="0">自由比例</option><option value="1">1 : 1 · 正方形</option><option value="1.3333333333333333">4 : 3 · 横向照片</option><option value="1.7777777777777777">16 : 9 · 宽屏</option><option value="0.75">3 : 4 · 竖向照片</option><option value="0.5625">9 : 16 · 竖屏</option></select>
      <div class="dimensions">${[
        ["x", "左边距 X"],
        ["y", "上边距 Y"],
        ["w", "宽度"],
        ["h", "高度"],
      ]
        .map(
          ([id, label]) =>
            `<label>${label}<div class="number-wrap"><input id="${id}" type="number" min="${id === "x" || id === "y" ? 0 : 1}" step="1" aria-label="${label}像素"><span>px</span></div></label>`,
        )
        .join("")}</div>
      <label for="format">导出格式</label><select id="format"><option value="image/png">PNG · 保留透明背景</option><option value="image/jpeg">JPEG · 白色背景，质量 92%</option></select>
      <label for="filename">文件名称</label><input id="filename" type="text" maxlength="100" value="裁剪图片" placeholder="裁剪图片">
      </fieldset>
      <button id="download" class="primary" disabled>↓ 通过迅雷下载</button><p id="status" role="status" aria-live="polite">选择一张图片，开始裁剪。</p>
    </aside>
  </div>
</main>`;

let source = $<HTMLImageElement>("source");
const stage = $("stage"),
  crop = $("crop"),
  preview = $<HTMLCanvasElement>("preview");
const controls = $<HTMLFieldSetElement>("controls"),
  download = $<HTMLButtonElement>("download");
const ratioInput = $<HTMLSelectElement>("ratio"),
  format = $<HTMLSelectElement>("format");
let rect: Rect = { x: 0, y: 0, w: 1, h: 1 };
let width = 0,
  height = 0,
  imageURL = "",
  loadVersion = 0,
  busy = false;
const ratio = () => Number(ratioInput.value);
function status(message: string, error = false) {
  $("status").textContent = message;
  $("status").classList.toggle("error", error);
}
function fitStage() {
  if (!width) return;
  const box = $("drop");
  const style = getComputedStyle(box);
  const availableWidth =
    box.clientWidth -
    parseFloat(style.paddingLeft) -
    parseFloat(style.paddingRight);
  const availableHeight =
    box.clientHeight -
    parseFloat(style.paddingTop) -
    parseFloat(style.paddingBottom);
  stage.style.width = `${Math.min(availableWidth, (availableHeight * width) / height)}px`;
}
new ResizeObserver(fitStage).observe($("drop"));
function render() {
  crop.style.left = `${(rect.x / width) * 100}%`;
  crop.style.top = `${(rect.y / height) * 100}%`;
  crop.style.width = `${(rect.w / width) * 100}%`;
  crop.style.height = `${(rect.h / height) * 100}%`;
  for (const key of ["x", "y", "w", "h"] as const)
    $<HTMLInputElement>(key).value = String(rect[key]);
  $("size").textContent = `${rect.w} × ${rect.h} px`;
  const scale = Math.min(1, 600 / rect.w, 360 / rect.h);
  preview.width = Math.max(1, Math.round(rect.w * scale));
  preview.height = Math.max(1, Math.round(rect.h * scale));
  const ctx = preview.getContext("2d")!;
  if (format.value === "image/jpeg") {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, preview.width, preview.height);
  }
  ctx.drawImage(
    source,
    rect.x,
    rect.y,
    rect.w,
    rect.h,
    0,
    0,
    preview.width,
    preview.height,
  );
}
function reset() {
  rect = initialCrop(width, height, ratio());
  render();
}
async function load(file?: File) {
  if (!file || busy) return;
  const version = ++loadVersion;
  if (!/^image\/(png|jpeg|webp|bmp)$/.test(file.type)) {
    status("请选择 JPG、PNG、WebP 或 BMP 图片。", true);
    return;
  }
  if (file.size > 30 * 1024 * 1024) {
    status("图片超过 30 MB，请选择较小的图片。", true);
    return;
  }
  const url = URL.createObjectURL(file),
    img = new Image();
  status("正在读取图片…");
  try {
    img.src = url;
    await img.decode();
    if (version !== loadVersion) {
      URL.revokeObjectURL(url);
      return;
    }
    if (
      img.naturalWidth * img.naturalHeight > 40_000_000 ||
      Math.max(img.naturalWidth, img.naturalHeight) > 16384
    )
      throw new Error(
        "图片尺寸过大，请使用不超过 4000 万像素、单边不超过 16384 像素的图片。",
      );
    img.id = "source";
    img.alt = "待裁剪的原图";
    img.draggable = false;
    source.replaceWith(img);
    source = img;
    if (imageURL) URL.revokeObjectURL(imageURL);
    imageURL = url;
    width = img.naturalWidth;
    height = img.naturalHeight;
    stage.style.aspectRatio = `${width} / ${height}`;
    fitStage();
    $("empty").hidden = true;
    stage.hidden = false;
    $("preview-empty").hidden = true;
    controls.disabled = false;
    download.disabled = false;
    $<HTMLButtonElement>("reset").disabled = false;
    $("meta").textContent = `${file.name} · ${width} × ${height} px`;
    $<HTMLInputElement>("filename").value =
      file.name.replace(/\.[^.]+$/, "") + "-裁剪";
    reset();
    status("调整裁剪区域后，即可通过迅雷保存。");
  } catch (error) {
    URL.revokeObjectURL(url);
    status(
      error instanceof Error ? error.message : "图片读取失败，请重新选择。",
      true,
    );
  }
}
$("choose").onclick = () => $<HTMLInputElement>("file").click();
$("file").onchange = () => {
  const input = $<HTMLInputElement>("file");
  void load(input.files?.[0]);
  input.value = "";
};
$("drop").ondragover = (e) => {
  e.preventDefault();
  $("drop").classList.add("dragging");
};
$("drop").ondragleave = () => $("drop").classList.remove("dragging");
$("drop").ondrop = (e) => {
  e.preventDefault();
  $("drop").classList.remove("dragging");
  void load(e.dataTransfer?.files[0]);
};
$("reset").onclick = reset;
ratioInput.onchange = reset;
format.onchange = render;
for (const key of ["x", "y", "w", "h"] as const) {
  $(key).onchange = () => {
    const value = Number($<HTMLInputElement>(key).value);
    rect = updateCrop(rect, key, value, width, height, ratio());
    render();
  };
}
let drag: {
  id: number;
  x: number;
  y: number;
  rect: Rect;
  corner: string;
  scaleX: number;
  scaleY: number;
} | null = null;
crop.onpointerdown = (e) => {
  if (busy) return;
  e.preventDefault();
  crop.focus();
  crop.setPointerCapture(e.pointerId);
  const bounds = stage.getBoundingClientRect();
  drag = {
    id: e.pointerId,
    x: e.clientX,
    y: e.clientY,
    rect: { ...rect },
    corner: (e.target as HTMLElement).dataset.corner || "",
    scaleX: width / bounds.width,
    scaleY: height / bounds.height,
  };
};
crop.onpointermove = (e) => {
  if (!drag || drag.id !== e.pointerId) return;
  const dx = (e.clientX - drag.x) * drag.scaleX,
    dy = (e.clientY - drag.y) * drag.scaleY,
    start = drag.rect;
  if (!drag.corner)
    rect = {
      ...start,
      x: clamp(Math.round(start.x + dx), 0, width - start.w),
      y: clamp(Math.round(start.y + dy), 0, height - start.h),
    };
  else {
    const left = drag.corner.includes("w"),
      top = drag.corner.includes("n");
    const anchorX = left ? start.x + start.w : start.x,
      anchorY = top ? start.y + start.h : start.y;
    const maxW = left ? anchorX : width - anchorX,
      maxH = top ? anchorY : height - anchorY;
    let w = clamp(start.w + (left ? -dx : dx), 1, maxW),
      h = clamp(start.h + (top ? -dy : dy), 1, maxH);
    const r = ratio();
    if (r) {
      w = Math.min(Math.abs(dx) > Math.abs(dy) * r ? w : h * r, maxW, maxH * r);
      h = w / r;
    }
    w = Math.max(1, Math.round(w));
    h = Math.max(1, Math.round(h));
    rect = {
      x: left ? anchorX - w : anchorX,
      y: top ? anchorY - h : anchorY,
      w,
      h,
    };
  }
  render();
};
crop.onpointerup =
  crop.onpointercancel =
  crop.onlostpointercapture =
    () => {
      drag = null;
    };
crop.onkeydown = (e) => {
  if (
    !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key) ||
    busy
  )
    return;
  e.preventDefault();
  const step = e.shiftKey ? 10 : 1;
  rect.x = clamp(
    rect.x +
      (e.key === "ArrowRight" ? step : e.key === "ArrowLeft" ? -step : 0),
    0,
    width - rect.w,
  );
  rect.y = clamp(
    rect.y + (e.key === "ArrowDown" ? step : e.key === "ArrowUp" ? -step : 0),
    0,
    height - rect.h,
  );
  render();
};
download.onclick = async () => {
  if (busy || !width) return;
  if (typeof xunlei === "undefined") {
    status("请在迅雷客户端加载此微应用后使用下载功能。", true);
    return;
  }
  busy = true;
  download.disabled = true;
  controls.disabled = true;
  $<HTMLButtonElement>("choose").disabled = true;
  $<HTMLButtonElement>("reset").disabled = true;
  let hostURL = "";
  try {
    status("正在生成裁剪图片…");
    const canvas = document.createElement("canvas");
    canvas.width = rect.w;
    canvas.height = rect.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("无法创建图片画布，请尝试较小的裁剪区域。");
    const mime = format.value;
    if (mime === "image/jpeg") {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, rect.w, rect.h);
    }
    ctx.drawImage(source, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) =>
          b ? resolve(b) : reject(new Error("图片编码失败，请缩小裁剪区域。")),
        mime,
        0.92,
      ),
    );
    canvas.width = 1;
    canvas.height = 1;
    const name = exportFilename($<HTMLInputElement>("filename").value, mime);
    hostURL = await xunlei.runtime.blob.createObjectURL(blob);
    status("正在创建迅雷下载任务…");
    const task = await xunlei.tasks.create({
      req: { url: hostURL },
      opts: { name },
    });
    status(
      `已创建下载任务：${name}（${task.id}）。请在迅雷查看进度，下载完成前保持应用打开。`,
    );
  } catch (error) {
    if (hostURL) {
      try {
        await xunlei.runtime.blob.revokeObjectURL(hostURL);
      } catch {
        /* Preserve original failure. */
      }
    }
    const message =
      error && typeof error === "object" && "message" in error
        ? String(error.message)
        : String(error);
    status(`下载未创建：${message}`, true);
  } finally {
    busy = false;
    download.disabled = false;
    controls.disabled = false;
    $<HTMLButtonElement>("choose").disabled = false;
    $<HTMLButtonElement>("reset").disabled = false;
  }
};
window.addEventListener("beforeunload", () => {
  if (imageURL) URL.revokeObjectURL(imageURL);
});
