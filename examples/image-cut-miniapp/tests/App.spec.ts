// @vitest-environment jsdom
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { nextTick } from "vue";
import App from "../src/App.vue";

let wrapper: VueWrapper;
const disconnect = vi.fn();
const drawImage = vi.fn();
const revokeObjectURL = vi.fn();
const decode = vi.fn();
const createTask = vi.fn();
const revokeHostURL = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  decode.mockResolvedValue(undefined);
  createTask.mockResolvedValue({ id: "task-1" });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect = disconnect;
    },
  );
  vi.stubGlobal(
    "Image",
    class {
      naturalWidth = 800;
      naturalHeight = 600;
      src = "";
      decode = decode;
    },
  );
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:local-image");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(revokeObjectURL);
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage,
    fillRect: vi.fn(),
    fillStyle: "",
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
    (callback) => {
      callback(new Blob(["image"], { type: "image/png" }));
    },
  );
  vi.stubGlobal("xunlei", {
    runtime: {
      blob: {
        createObjectURL: vi.fn().mockResolvedValue("host:crop"),
        revokeObjectURL: revokeHostURL,
      },
    },
    tasks: { create: createTask },
  });
  wrapper = mount(App);
});

afterEach(() => {
  wrapper.unmount();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function chooseImage(name = "photo.png", type = "image/png") {
  const input = wrapper.get<HTMLInputElement>("#file");
  Object.defineProperty(input.element, "files", {
    configurable: true,
    value: [new File(["image"], name, { type })],
  });
  await input.trigger("change");
  await flushPromises();
}

test("loads an image and updates the crop, keyboard position and preview reactively", async () => {
  expect(wrapper.get<HTMLButtonElement>("#download").element.disabled).toBe(
    true,
  );
  await chooseImage();
  expect(wrapper.get("#meta").text()).toContain("photo.png · 800 × 600 px");
  expect(wrapper.get<HTMLButtonElement>("#download").element.disabled).toBe(
    false,
  );
  await wrapper.get("#ratio").setValue("1");
  expect(wrapper.get<HTMLInputElement>("#w").element.value).toBe("600");
  expect(wrapper.get<HTMLInputElement>("#x").element.value).toBe("100");
  await wrapper
    .get("#crop")
    .trigger("keydown", { key: "ArrowRight", shiftKey: true });
  expect(wrapper.get<HTMLInputElement>("#x").element.value).toBe("110");
  await wrapper.get("#w").setValue("300");
  expect(wrapper.get("#size").text()).toBe("300 × 300 px");
  expect(drawImage).toHaveBeenLastCalledWith(
    expect.anything(),
    110,
    0,
    300,
    300,
    0,
    0,
    300,
    300,
  );
  await wrapper.get("#reset").trigger("click");
  expect(wrapper.get("#size").text()).toBe("600 × 600 px");
});

test("exports through the host and retains a successful task URL", async () => {
  await chooseImage();
  await wrapper.get("#filename").setValue("result");
  await wrapper.get("#format").setValue("image/jpeg");
  await wrapper.get("#download").trigger("click");
  await flushPromises();
  expect(createTask).toHaveBeenCalledWith({
    req: { url: "host:crop" },
    opts: { name: "result.jpg" },
  });
  expect(wrapper.get("#status").text()).toContain("已创建下载任务");
  expect(revokeHostURL).not.toHaveBeenCalled();
  wrapper.unmount();
  expect(disconnect).toHaveBeenCalledOnce();
  expect(revokeObjectURL).toHaveBeenCalledWith("blob:local-image");
});

async function pointer(element: Element, name: string, init: PointerEventInit) {
  element.dispatchEvent(
    new window.PointerEvent(name, { ...init, bubbles: true, cancelable: true }),
  );
  await nextTick();
}

test("accepts a dropped image and moves and resizes the crop with pointer events", async () => {
  await wrapper.get("#drop").trigger("drop", {
    dataTransfer: {
      files: [new File(["image"], "drop.png", { type: "image/png" })],
    },
  });
  await flushPromises();
  expect(wrapper.get("#meta").text()).toContain("drop.png");
  await wrapper.get("#w").setValue("400");
  await wrapper.get("#h").setValue("300");
  const crop = wrapper.get<HTMLElement>("#crop");
  crop.element.setPointerCapture = vi.fn();
  vi.spyOn(
    wrapper.get("#stage").element,
    "getBoundingClientRect",
  ).mockReturnValue({
    width: 400,
    height: 300,
  } as DOMRect);
  await pointer(crop.element, "pointerdown", {
    pointerId: 1,
    clientX: 0,
    clientY: 0,
  });
  await pointer(crop.element, "pointermove", {
    pointerId: 1,
    clientX: 25,
    clientY: 15,
  });
  await pointer(crop.element, "pointerup", { pointerId: 1 });
  expect(wrapper.get<HTMLInputElement>("#x").element.value).toBe("50");
  expect(wrapper.get<HTMLInputElement>("#y").element.value).toBe("30");
  await pointer(wrapper.get(".handle.se").element, "pointerdown", {
    pointerId: 2,
    clientX: 0,
    clientY: 0,
  });
  await pointer(crop.element, "pointermove", {
    pointerId: 2,
    clientX: 25,
    clientY: 15,
  });
  await pointer(crop.element, "pointerup", { pointerId: 2 });
  expect(wrapper.get("#size").text()).toBe("450 × 330 px");
});

test("reports invalid files and releases the host URL when task creation fails", async () => {
  await chooseImage("file.txt", "text/plain");
  expect(wrapper.get("#status").classes()).toContain("error");
  expect(decode).not.toHaveBeenCalled();
  await chooseImage();
  createTask.mockRejectedValueOnce(new Error("permission denied"));
  await wrapper.get("#download").trigger("click");
  await flushPromises();
  expect(revokeHostURL).toHaveBeenCalledWith("host:crop");
  expect(wrapper.get("#status").text()).toContain("permission denied");
  expect(wrapper.get<HTMLButtonElement>("#download").element.disabled).toBe(
    false,
  );
});

test("releases an image that finishes decoding after unmount", async () => {
  let finish!: () => void;
  decode.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  await chooseImage();
  wrapper.unmount();
  finish();
  await flushPromises();
  expect(revokeObjectURL).toHaveBeenCalledWith("blob:local-image");
  expect(drawImage).not.toHaveBeenCalled();
});
