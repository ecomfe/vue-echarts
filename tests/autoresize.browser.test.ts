import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { effectScope, nextTick, ref } from "vue";

import { throttle, resetECharts, createEChartsModule } from "./helpers/mock";
import { createSizedContainer, flushAnimationFrame } from "./helpers/dom";
import { useAutoresize } from "../src/composables/autoresize";
import type { AutoResize, EChartsType } from "../src/types";

vi.mock("echarts/core", () => createEChartsModule());

function createChart(
  resize: Mock<() => void>,
  root: () => HTMLElement | undefined,
  initialRoot: HTMLElement,
): EChartsType {
  let width = initialRoot.offsetWidth;
  let height = initialRoot.offsetHeight;
  resize.mockImplementation((options?: Parameters<EChartsType["resize"]>[0]) => {
    const element = root();
    if (element) {
      width = typeof options?.width === "number" ? options.width : element.offsetWidth;
      height = typeof options?.height === "number" ? options.height : element.offsetHeight;
    }
  });
  return {
    resize,
    getWidth: () => width,
    getHeight: () => height,
  } as unknown as EChartsType;
}

const stops: Array<() => void> = [];

async function mountAutoresize(container: HTMLElement, value: AutoResize | undefined = true) {
  const resize = vi.fn();
  const chart = ref<EChartsType | undefined>();
  const autoresize = ref<AutoResize | undefined>(value);
  const root = ref<HTMLElement | undefined>();
  const scope = effectScope();

  scope.run(() => useAutoresize(chart, autoresize, root));
  stops.push(() => scope.stop());

  const instance = createChart(resize, () => root.value, container);
  chart.value = instance;
  root.value = container;
  await nextTick();

  return { resize, chart, autoresize, instance, scope };
}

describe("useAutoresize", () => {
  beforeEach(() => {
    stops.length = 0;
    resetECharts();
  });

  afterEach(() => {
    for (const stop of stops) {
      stop();
    }
  });

  it("observes the container, resizes on change, and disconnects on cleanup", async () => {
    const observe = vi.spyOn(window.ResizeObserver.prototype, "observe");
    const disconnect = vi.spyOn(window.ResizeObserver.prototype, "disconnect");
    const container = createSizedContainer(120, 80);
    const { resize, scope } = await mountAutoresize(container);

    expect(observe).toHaveBeenCalledWith(container);
    expect(vi.mocked(throttle)).toHaveBeenCalledWith(expect.any(Function), 100);

    await flushAnimationFrame();
    expect(resize).not.toHaveBeenCalled();

    container.style.width = "200px";
    await flushAnimationFrame();
    expect(resize).toHaveBeenCalledOnce();

    scope.stop();
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it("does not repeat a resize completed before observer notification", async () => {
    const container = createSizedContainer(120, 80);
    const { resize, instance } = await mountAutoresize(container);

    container.style.width = "200px";
    instance.resize();
    await flushAnimationFrame();

    expect(resize).toHaveBeenCalledOnce();
  });

  it("skips zero-sized containers and resizes on recovery", async () => {
    const onResize = vi.fn();
    const container = createSizedContainer(0, 0);
    const { resize } = await mountAutoresize(container, { throttle: 0, onResize });
    await flushAnimationFrame();

    container.style.height = "120px";
    await flushAnimationFrame();
    expect(resize).not.toHaveBeenCalled();

    container.style.width = "160px";
    await flushAnimationFrame();
    expect(resize).toHaveBeenCalledOnce();
    expect(onResize).toHaveBeenCalledOnce();
  });

  it("rechecks throttled dimensions and cancels pending work on cleanup", async () => {
    let pendingResize: (() => void) | undefined;
    vi.mocked(throttle).mockImplementation((fn) => {
      const throttled = (() => {
        pendingResize = fn as () => void;
      }) as ReturnType<typeof throttle>;
      throttled.clear = vi.fn(() => {
        pendingResize = undefined;
      });
      return throttled;
    });

    const container = createSizedContainer(120, 80);
    const { resize, chart } = await mountAutoresize(container, { throttle: 1000 });
    await flushAnimationFrame();

    container.style.width = "180px";
    await flushAnimationFrame();
    expect(pendingResize).toBeTypeOf("function");

    container.style.width = "120px";
    await flushAnimationFrame();
    pendingResize?.();
    expect(resize).not.toHaveBeenCalled();

    container.style.width = "200px";
    await flushAnimationFrame();
    expect(pendingResize).toBeTypeOf("function");

    chart.value = undefined;
    expect(pendingResize).toBeUndefined();
  });

  it("uses the latest callback and throttle", async () => {
    const onResizeA = vi.fn();
    const onResizeB = vi.fn();
    const container = createSizedContainer(80, 60);
    const { resize, autoresize } = await mountAutoresize(container, {
      throttle: 0,
      onResize: onResizeA,
    });

    expect(vi.mocked(throttle)).not.toHaveBeenCalled();

    container.style.height = "100px";
    await flushAnimationFrame();
    expect(onResizeA).toHaveBeenCalledOnce();

    autoresize.value = { throttle: 0, onResize: onResizeB };
    await nextTick();

    container.style.width = "100px";
    await flushAnimationFrame();
    expect(resize).toHaveBeenCalledTimes(2);
    expect(onResizeA).toHaveBeenCalledOnce();
    expect(onResizeB).toHaveBeenCalledOnce();

    autoresize.value = { throttle: 150, onResize: onResizeB };
    await nextTick();
    expect(vi.mocked(throttle)).toHaveBeenCalledWith(expect.any(Function), 150);
  });

  it("pauses while disabled and resynchronizes when reactivated", async () => {
    const container = createSizedContainer(140, 90);
    const { resize, autoresize } = await mountAutoresize(container);
    await flushAnimationFrame();

    autoresize.value = false;
    await nextTick();

    container.style.height = "120px";
    await flushAnimationFrame();
    expect(resize).not.toHaveBeenCalled();

    autoresize.value = true;
    await nextTick();
    await flushAnimationFrame();
    expect(resize).toHaveBeenCalledOnce();
  });

  it("resizes when the content box changes without changing the outer size", async () => {
    const container = createSizedContainer(120, 80);
    container.style.boxSizing = "border-box";
    const resize = vi.fn();
    const chart = ref<EChartsType | undefined>();
    const autoresize = ref<AutoResize | undefined>(true);
    const root = ref<HTMLElement | undefined>();
    let width = 120;
    const instance = {
      resize: resize.mockImplementation(() => {
        const style = getComputedStyle(container);
        width =
          container.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      }),
      getWidth: () => width,
      getHeight: () => 80,
    } as unknown as EChartsType;
    const scope = effectScope();
    stops.push(() => scope.stop());

    scope.run(() => useAutoresize(chart, autoresize, root));
    chart.value = instance;
    root.value = container;
    await nextTick();
    await flushAnimationFrame();
    resize.mockClear();

    container.style.padding = "0 10px";
    await flushAnimationFrame();

    expect(resize).toHaveBeenCalledOnce();
    expect(instance.getWidth()).toBe(100);
    expect(container.offsetWidth).toBe(120);
  });
});
