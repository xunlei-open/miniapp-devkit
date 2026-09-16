<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from "vue";
import {
  clamp,
  initialCrop,
  updateCrop,
  exportFilename,
  type Rect,
} from "./crop";

const fileInput = ref<HTMLInputElement>();
const drop = ref<HTMLDivElement>();
const stage = ref<HTMLDivElement>();
const crop = ref<HTMLDivElement>();
const preview = ref<HTMLCanvasElement>();
const dragging = ref(false);
const stageWidth = ref("0px");
const fields: { key: keyof Rect; label: string }[] = [
  { key: "x", label: "左边距 X" },
  { key: "y", label: "上边距 Y" },
  { key: "w", label: "宽度" },
  { key: "h", label: "高度" },
];
const state = reactive({
  rect: { x: 0, y: 0, w: 1, h: 1 } as Rect,
  width: 0,
  height: 0,
  imageURL: "",
  busy: false,
  ratio: 0,
  format: "image/png",
  filename: "裁剪图片",
  meta: "尚未选择图片",
  message: "选择一张图片，开始裁剪。",
  error: false,
});
let source: HTMLImageElement | undefined;
let loadVersion = 0;
let disposed = false;
let observer: ResizeObserver | undefined;
const cropStyle = computed(() => ({
  left: `${(state.rect.x / (state.width || 1)) * 100}%`,
  top: `${(state.rect.y / (state.height || 1)) * 100}%`,
  width: `${(state.rect.w / (state.width || 1)) * 100}%`,
  height: `${(state.rect.h / (state.height || 1)) * 100}%`,
}));
function status(message: string, error = false) {
  state.message = message;
  state.error = error;
}
function fitStage() {
  const box = drop.value;
  if (!box || !state.width) return;
  const style = getComputedStyle(box);
  const availableWidth =
    box.clientWidth -
    parseFloat(style.paddingLeft) -
    parseFloat(style.paddingRight);
  const availableHeight =
    box.clientHeight -
    parseFloat(style.paddingTop) -
    parseFloat(style.paddingBottom);
  stageWidth.value = `${Math.max(0, Math.min(availableWidth, (availableHeight * state.width) / state.height))}px`;
}
function renderPreview() {
  const canvas = preview.value;
  if (!canvas || !source || !state.width) return;
  const { rect } = state;
  const scale = Math.min(1, 600 / rect.w, 360 / rect.h);
  canvas.width = Math.max(1, Math.round(rect.w * scale));
  canvas.height = Math.max(1, Math.round(rect.h * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  if (state.format === "image/jpeg") {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(
    source,
    rect.x,
    rect.y,
    rect.w,
    rect.h,
    0,
    0,
    canvas.width,
    canvas.height,
  );
}
watch(() => [state.rect, state.format], renderPreview, {
  deep: true,
  flush: "post",
});
function reset() {
  if (state.busy || !state.width) return;
  state.rect = initialCrop(state.width, state.height, state.ratio);
}
async function load(file?: File) {
  if (!file || state.busy) return;
  const version = ++loadVersion;
  if (!/^image\/(png|jpeg|webp|bmp)$/.test(file.type)) {
    status("请选择 JPG、PNG、WebP 或 BMP 图片。", true);
    return;
  }
  if (file.size > 30 * 1024 * 1024) {
    status("图片超过 30 MB，请选择较小的图片。", true);
    return;
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  status("正在读取图片…");
  try {
    img.src = url;
    await img.decode();
    if (disposed || version !== loadVersion) {
      URL.revokeObjectURL(url);
      return;
    }
    if (
      img.naturalWidth * img.naturalHeight > 40_000_000 ||
      Math.max(img.naturalWidth, img.naturalHeight) > 16384
    ) {
      throw new Error(
        "图片尺寸过大，请使用不超过 4000 万像素、单边不超过 16384 像素的图片。",
      );
    }
    endDrag();
    if (state.imageURL) URL.revokeObjectURL(state.imageURL);
    source = img;
    state.imageURL = url;
    state.width = img.naturalWidth;
    state.height = img.naturalHeight;
    state.meta = `${file.name} · ${state.width} × ${state.height} px`;
    state.filename = file.name.replace(/\.[^.]+$/, "") + "-裁剪";
    reset();
    status("调整裁剪区域后，即可通过迅雷保存。");
    await nextTick();
    fitStage();
  } catch (error) {
    URL.revokeObjectURL(url);
    if (disposed || version !== loadVersion) return;
    status(
      error instanceof Error ? error.message : "图片读取失败，请重新选择。",
      true,
    );
  }
}
function chooseFile(event: Event) {
  const input = event.target as HTMLInputElement;
  void load(input.files?.[0]);
  input.value = "";
}
function dropFile(event: DragEvent) {
  dragging.value = false;
  void load(event.dataTransfer?.files[0]);
}
function changeDimension(key: keyof Rect, event: Event) {
  const input = event.target as HTMLInputElement;
  state.rect = updateCrop(
    state.rect,
    key,
    Number(input.value),
    state.width,
    state.height,
    state.ratio,
  );
  input.value = String(state.rect[key]);
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
function startDrag(e: PointerEvent) {
  if (state.busy) return;
  e.preventDefault();
  crop.value!.focus();
  crop.value!.setPointerCapture(e.pointerId);
  const bounds = stage.value!.getBoundingClientRect();
  drag = {
    id: e.pointerId,
    x: e.clientX,
    y: e.clientY,
    rect: { ...state.rect },
    corner: (e.target as HTMLElement).dataset.corner || "",
    scaleX: state.width / bounds.width,
    scaleY: state.height / bounds.height,
  };
}
function moveDrag(e: PointerEvent) {
  if (state.busy || !drag || drag.id !== e.pointerId) return;
  const dx = (e.clientX - drag.x) * drag.scaleX,
    dy = (e.clientY - drag.y) * drag.scaleY,
    start = drag.rect;
  if (!drag.corner)
    state.rect = {
      ...start,
      x: clamp(Math.round(start.x + dx), 0, state.width - start.w),
      y: clamp(Math.round(start.y + dy), 0, state.height - start.h),
    };
  else {
    const left = drag.corner.includes("w"),
      top = drag.corner.includes("n");
    const anchorX = left ? start.x + start.w : start.x,
      anchorY = top ? start.y + start.h : start.y;
    const maxW = left ? anchorX : state.width - anchorX,
      maxH = top ? anchorY : state.height - anchorY;
    let w = clamp(start.w + (left ? -dx : dx), 1, maxW),
      h = clamp(start.h + (top ? -dy : dy), 1, maxH);
    const r = state.ratio;
    if (r) {
      w = Math.min(Math.abs(dx) > Math.abs(dy) * r ? w : h * r, maxW, maxH * r);
      h = w / r;
    }
    w = Math.max(1, Math.round(w));
    h = Math.max(1, Math.round(h));
    state.rect = {
      x: left ? anchorX - w : anchorX,
      y: top ? anchorY - h : anchorY,
      w,
      h,
    };
  }
}
function endDrag() {
  drag = null;
}
function moveWithKeyboard(e: KeyboardEvent) {
  if (
    !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key) ||
    state.busy
  )
    return;
  e.preventDefault();
  const step = e.shiftKey ? 10 : 1;
  state.rect.x = clamp(
    state.rect.x +
      (e.key === "ArrowRight" ? step : e.key === "ArrowLeft" ? -step : 0),
    0,
    state.width - state.rect.w,
  );
  state.rect.y = clamp(
    state.rect.y +
      (e.key === "ArrowDown" ? step : e.key === "ArrowUp" ? -step : 0),
    0,
    state.height - state.rect.h,
  );
}
async function download() {
  if (state.busy || !state.width || !source) return;
  if (typeof xunlei === "undefined") {
    status("请在迅雷客户端加载此微应用后使用下载功能。", true);
    return;
  }
  endDrag();
  state.busy = true;
  let hostURL = "";
  try {
    status("正在生成裁剪图片…");
    const canvas = document.createElement("canvas");
    canvas.width = state.rect.w;
    canvas.height = state.rect.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("无法创建图片画布，请尝试较小的裁剪区域。");
    const mime = state.format;
    if (mime === "image/jpeg") {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, state.rect.w, state.rect.h);
    }
    ctx.drawImage(
      source,
      state.rect.x,
      state.rect.y,
      state.rect.w,
      state.rect.h,
      0,
      0,
      state.rect.w,
      state.rect.h,
    );
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
    const name = exportFilename(state.filename, mime);
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
    state.busy = false;
  }
}

onMounted(() => {
  observer = new ResizeObserver(fitStage);
  if (drop.value) observer.observe(drop.value);
});
onBeforeUnmount(() => {
  disposed = true;
  ++loadVersion;
  observer?.disconnect();
  endDrag();
  if (state.imageURL) URL.revokeObjectURL(state.imageURL);
});
</script>

<template>
  <header>
    <div class="brand">
      <span class="logo">◩</span
      ><span>迅雷图片裁剪<small>IMAGE CUT</small></span>
    </div>
    <span class="badge">本地处理 · 无需上传</span>
  </header>
  <main>
    <div class="workspace">
      <section class="editor panel" aria-label="图片裁剪编辑器">
        <div class="panel-title">
          <h2><span>01</span> 裁剪画面</h2>
          <button
            id="choose"
            :disabled="state.busy"
            @click="fileInput?.click()"
            class="secondary"
          >
            选择图片</button
          ><input
            id="file"
            ref="fileInput"
            @change="chooseFile"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/bmp"
            hidden
          />
        </div>
        <div
          id="drop"
          ref="drop"
          class="drop"
          :class="{ dragging }"
          @dragover.prevent="dragging = true"
          @dragleave="dragging = false"
          @drop.prevent="dropFile"
        >
          <div id="empty" :hidden="!!state.width">
            <div class="empty-icon">⊞</div>
            <h3>把图片放进来</h3>
            <p>拖放图片到这里，或点击上方「选择图片」</p>
            <small>支持 JPG、PNG、WebP、BMP · 最大 30 MB</small>
          </div>
          <div
            id="stage"
            ref="stage"
            :hidden="!state.width"
            :style="{
              width: stageWidth,
              aspectRatio: `${state.width} / ${state.height}`,
            }"
          >
            <img
              id="source"
              :src="state.imageURL || undefined"
              alt="待裁剪的原图"
              draggable="false"
            />
            <div
              id="crop"
              ref="crop"
              :style="cropStyle"
              @pointerdown="startDrag"
              @pointermove="moveDrag"
              @pointerup="endDrag"
              @pointercancel="endDrag"
              @lostpointercapture="endDrag"
              @keydown="moveWithKeyboard"
              tabindex="0"
              role="group"
              aria-label="裁剪区域，方向键移动，Shift 加速"
            >
              <i class="grid vertical"></i><i class="grid horizontal"></i
              ><span class="handle nw" data-corner="nw"></span
              ><span class="handle ne" data-corner="ne"></span
              ><span class="handle sw" data-corner="sw"></span
              ><span class="handle se" data-corner="se"></span>
            </div>
          </div>
        </div>
        <div class="image-meta">
          <span id="meta">{{ state.meta }}</span
          ><button
            id="reset"
            class="text-button"
            :disabled="!state.width || state.busy"
            @click="reset"
          >
            重置裁剪
          </button>
        </div>
        <div class="preview-row">
          <div class="preview-block">
            <div class="preview-heading">
              <label>实时预览</label
              ><span id="size">{{
                state.width ? `${state.rect.w} × ${state.rect.h} px` : "—"
              }}</span>
            </div>
            <div class="preview">
              <canvas
                id="preview"
                ref="preview"
                width="1"
                height="1"
                aria-label="裁剪结果预览"
              ></canvas
              ><span id="preview-empty" :hidden="!!state.width"
                >裁剪结果将在这里显示</span
              >
            </div>
          </div>
          <p class="hint">
            拖动选框移动，拖动四角调整大小。也可使用像素输入精确裁剪。
          </p>
        </div>
      </section>
      <aside class="panel settings">
        <h2><span>02</span> 调整与导出</h2>
        <fieldset id="controls" :disabled="!state.width || state.busy">
          <legend>裁剪设置</legend>
          <label for="ratio">裁剪比例</label
          ><select id="ratio" v-model.number="state.ratio" @change="reset">
            <option value="0">自由比例</option>
            <option value="1">1 : 1 · 正方形</option>
            <option value="1.3333333333333333">4 : 3 · 横向照片</option>
            <option value="1.7777777777777777">16 : 9 · 宽屏</option>
            <option value="0.75">3 : 4 · 竖向照片</option>
            <option value="0.5625">9 : 16 · 竖屏</option>
          </select>
          <div class="dimensions">
            <label v-for="field in fields" :key="field.key"
              >{{ field.label }}
              <div class="number-wrap">
                <input
                  :id="field.key"
                  type="number"
                  :min="field.key === 'x' || field.key === 'y' ? 0 : 1"
                  step="1"
                  :aria-label="field.label + '像素'"
                  :value="state.rect[field.key]"
                  @change="changeDimension(field.key, $event)"
                /><span>px</span>
              </div></label
            >
          </div>
          <label for="format">导出格式</label
          ><select id="format" v-model="state.format">
            <option value="image/png">PNG · 保留透明背景</option>
            <option value="image/jpeg">JPEG · 白色背景，质量 92%</option>
          </select>
          <label for="filename">文件名称</label
          ><input
            id="filename"
            v-model="state.filename"
            type="text"
            maxlength="100"
            placeholder="裁剪图片"
          />
        </fieldset>
        <button
          id="download"
          class="primary"
          :disabled="!state.width || state.busy"
          @click="download"
        >
          ↓ 通过迅雷下载
        </button>
        <p
          id="status"
          :class="{ error: state.error }"
          role="status"
          aria-live="polite"
        >
          {{ state.message }}
        </p>
      </aside>
    </div>
  </main>
</template>
