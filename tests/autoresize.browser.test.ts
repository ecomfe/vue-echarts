import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Mock } from "vitest";
import { ref, effectScope, nextTick, reactive } from "vue";

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
  resize.mockImplementation(() => {
    const element = root();
    if (element) {
      width = element.offsetWidth;
      height = element.offsetHeight;
    }
  });
  return {
    resize,
    getWidth: () => width,
    getHeight: () => height,
  } as unknown as EChartsType;
}

describe("useAutoresize", () => {
  beforeEach(() => {
    resetECharts();
  });

  it("observes the root element and triggers resize on size change", async () => {
    const resize = vi.fn();
    const chart = ref<EChartsType | undefined>();
    const autoresize = ref<AutoResize | undefined>(true);
    const root = ref<HTMLElement | undefined>();

    const observeSpy = vi.spyOn(window.ResizeObserver.prototype, "observe");
    const disconnectSpy = vi.spyOn(window.ResizeObserver.prototype, "disconnect");

    const container = createSizedContainer(120, 80);

    const scope = effectScope();
    scope.run(() => {
      useAutoresize(chart, autoresize, root);
    });

    chart.value = createChart(resize, () => root.value, container);
    root.value = container;
    await nextTick();

    expect(observeSpy).toHaveBeenCalledWith(container);

    await flushAnimationFrame();
    expect(resize).not.toHaveBeenCalled();

    container.style.width = "200px";
    await flushAnimationFrame();

    expect(resize).toHaveBeenCalledTimes(1);

    scope.stop();
    await flushAnimationFrame();
    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });

  it("does not repeat a resize completed before observer notification", async () => {
    const container = createSizedContainer(120, 80);
    const resize = vi.fn();
    const chart = ref<EChartsType | undefined>();
    const autoresize = ref<AutoResize | undefined>(true);
    const root = ref<HTMLElement | undefined>();

    const scope = effectScope();
    scope.run(() => {
      useAutoresize(chart, autoresize, root);
    });

    chart.value = createChart(resize, () => root.value, container);
    root.value = container;
    await nextTick();

    container.style.width = "200px";
    chart.value.resize();
    await flushAnimationFrame();

    expect(resize).toHaveBeenCalledOnce();

    scope.stop();
  });

  it("skips resize when autoresize is disabled or container is empty", async () => {
    const resize = vi.fn();
    const chart = ref<EChartsType | undefined>();
    const autoresize = ref<AutoResize | undefined>();
    const root = ref<HTMLElement | undefined>();

    const observeSpy = vi.spyOn(window.ResizeObserver.prototype, "observe");

    const container = createSizedContainer(0, 0);

    const scope = effectScope();
    scope.run(() => {
      useAutoresize(chart, autoresize, root);
    });

    chart.value = createChart(resize, () => root.value, container);
    root.value = container;
    await nextTick();

    expect(observeSpy).not.toHaveBeenCalled();
    expect(resize).not.toHaveBeenCalled();

    autoresize.value = true;
    await nextTick();

    expect(observeSpy).toHaveBeenCalledWith(container);

    container.style.height = "120px";
    await flushAnimationFrame();
    expect(resize).not.toHaveBeenCalled();

    container.style.width = "160px";
    await flushAnimationFrame();
    expect(resize).toHaveBeenCalledTimes(1);

    scope.stop();
  });

  it("skips stale throttled work and resizes after zero-sized recovery", async () => {
    let pendingResize: (() => void) | undefined;
    vi.mocked(throttle).mockImplementation((fn) => {
      const throttled = (() => {
        pendingResize = fn as () => void;
      }) as ReturnType<typeof throttle>;
      throttled.clear = vi.fn();
      return throttled;
    });

    const resize = vi.fn();
    const onResize = vi.fn();
    const chart = ref<EChartsType | undefined>();
    const autoresize = ref<AutoResize | undefined>({ onResize });
    const root = ref<HTMLElement | undefined>();
    const container = createSizedContainer(120, 80);

    const scope = effectScope();
    scope.run(() => {
      useAutoresize(chart, autoresize, root);
    });

    chart.value = createChart(resize, () => root.value, container);
    root.value = container;
    await nextTick();
    await flushAnimationFrame();

    container.style.width = "180px";
    await flushAnimationFrame();
    expect(pendingResize).toBeTypeOf("function");
    expect(resize).not.toHaveBeenCalled();

    container.style.width = "120px";
    pendingResize?.();
    expect(resize).not.toHaveBeenCalled();
    expect(onResize).not.toHaveBeenCalled();

    container.style.width = "180px";
    await flushAnimationFrame();
    container.style.width = "0";
    pendingResize?.();
    expect(resize).not.toHaveBeenCalled();
    expect(onResize).not.toHaveBeenCalled();

    container.style.width = "180px";
    await flushAnimationFrame();
    container.style.width = "120px";
    pendingResize?.();
    expect(resize).toHaveBeenCalledOnce();
    expect(onResize).toHaveBeenCalledOnce();

    container.style.width = "200px";
    await flushAnimationFrame();
    chart.value.resize();
    pendingResize?.();
    expect(resize).toHaveBeenCalledTimes(2);
    expect(onResize).toHaveBeenCalledOnce();

    scope.stop();
  });

  it("uses the latest callback and rebinds only when throttle changes", async () => {
    const resize = vi.fn();
    const chart = ref<EChartsType | undefined>();
    const onResizeA = vi.fn();
    const onResizeB = vi.fn();
    const settings = reactive({ throttle: 0, onResize: onResizeA });
    const autoresize = ref<AutoResize | undefined>(settings);
    const root = ref<HTMLElement | undefined>();

    const container = createSizedContainer(80, 60);
    const disconnectSpy = vi.spyOn(window.ResizeObserver.prototype, "disconnect");

    const scope = effectScope();
    scope.run(() => {
      useAutoresize(chart, autoresize, root);
    });

    chart.value = createChart(resize, () => root.value, container);
    root.value = container;
    await nextTick();

    expect(vi.mocked(throttle)).not.toHaveBeenCalled();

    container.style.height = "100px";
    await flushAnimationFrame();

    expect(resize).toHaveBeenCalledTimes(1);
    expect(onResizeA).toHaveBeenCalledTimes(1);

    settings.onResize = onResizeB;
    await nextTick();

    expect(disconnectSpy).not.toHaveBeenCalled();

    container.style.width = "100px";
    await flushAnimationFrame();

    expect(resize).toHaveBeenCalledTimes(2);
    expect(onResizeA).toHaveBeenCalledTimes(1);
    expect(onResizeB).toHaveBeenCalledTimes(1);

    settings.throttle = 150;
    await nextTick();

    expect(disconnectSpy).toHaveBeenCalledTimes(1);
    expect(vi.mocked(throttle)).toHaveBeenCalledTimes(1);
    const [, wait] = vi.mocked(throttle).mock.calls[0];
    expect(wait).toBe(150);

    scope.stop();
  });

  it("disconnects observer when autoresize toggles off and reactivates cleanly", async () => {
    const resize = vi.fn();
    const chart = ref<EChartsType | undefined>();
    const autoresize = ref<AutoResize | undefined>(true);
    const root = ref<HTMLElement | undefined>();

    const observeSpy = vi.spyOn(window.ResizeObserver.prototype, "observe");
    const disconnectSpy = vi.spyOn(window.ResizeObserver.prototype, "disconnect");

    const container = createSizedContainer(140, 90);

    const scope = effectScope();
    scope.run(() => {
      useAutoresize(chart, autoresize, root);
    });

    chart.value = createChart(resize, () => root.value, container);
    root.value = container;
    await nextTick();

    expect(observeSpy).toHaveBeenCalledTimes(1);
    const throttledResize = vi.mocked(throttle).mock.results[0].value;

    autoresize.value = false;
    await nextTick();

    expect(disconnectSpy).toHaveBeenCalledTimes(1);
    expect(resize).not.toHaveBeenCalled();

    container.style.height = "120px";
    await flushAnimationFrame();
    expect(resize).not.toHaveBeenCalled();

    autoresize.value = true;
    await nextTick();

    expect(observeSpy).toHaveBeenCalledTimes(2);
    await flushAnimationFrame();
    expect(resize).toHaveBeenCalledTimes(1);

    scope.stop();
    expect(throttledResize.clear).toHaveBeenCalledTimes(1);
  });

  it("rebinds observer when root element changes", async () => {
    const resize = vi.fn();
    const chart = ref<EChartsType | undefined>();
    const autoresize = ref<AutoResize | undefined>(true);
    const root = ref<HTMLElement | undefined>();

    const observeSpy = vi.spyOn(window.ResizeObserver.prototype, "observe");
    const disconnectSpy = vi.spyOn(window.ResizeObserver.prototype, "disconnect");

    const firstContainer = createSizedContainer(120, 80);
    const secondContainer = createSizedContainer(200, 120);

    const scope = effectScope();
    scope.run(() => {
      useAutoresize(chart, autoresize, root);
    });

    chart.value = createChart(resize, () => root.value, firstContainer);
    root.value = firstContainer;
    await nextTick();

    expect(observeSpy).toHaveBeenCalledWith(firstContainer);

    root.value = undefined;
    await nextTick();

    expect(disconnectSpy).toHaveBeenCalledTimes(1);

    root.value = secondContainer;
    await nextTick();

    expect(observeSpy).toHaveBeenCalledWith(secondContainer);
    expect(resize).toHaveBeenCalledTimes(1);

    secondContainer.style.width = "240px";
    await flushAnimationFrame();
    expect(resize).toHaveBeenCalledTimes(2);

    scope.stop();
  });

  it("resets sizing when the chart is removed and targets replacement instances", async () => {
    const firstResize = vi.fn();
    const secondResize = vi.fn();
    const chart = ref<EChartsType | undefined>();
    const autoresize = ref<AutoResize | undefined>(true);
    const root = ref<HTMLElement | undefined>();

    const container = createSizedContainer(160, 90);
    const firstChart = createChart(firstResize, () => root.value, container);
    const secondChart = createChart(secondResize, () => root.value, container);

    const scope = effectScope();
    scope.run(() => {
      useAutoresize(chart, autoresize, root);
    });

    chart.value = firstChart;
    root.value = container;
    await nextTick();

    container.style.height = "120px";
    await flushAnimationFrame();
    expect(firstResize).toHaveBeenCalledTimes(1);
    expect(secondResize).not.toHaveBeenCalled();

    chart.value = undefined;
    await nextTick();
    container.style.width = "200px";
    chart.value = firstChart;
    await nextTick();

    expect(firstResize).toHaveBeenCalledTimes(1);

    chart.value = secondChart;
    await nextTick();

    container.style.width = "220px";
    await flushAnimationFrame();
    expect(firstResize).toHaveBeenCalledTimes(1);
    expect(secondResize).toHaveBeenCalledTimes(1);

    scope.stop();
  });

  it("deduplicates unchanged dimensions except after zero-sized recovery", async () => {
    const resize = vi.fn();
    const chart = ref<EChartsType | undefined>();
    const autoresize = ref<AutoResize | undefined>(true);
    const root = ref<HTMLElement | undefined>();
    const container = createSizedContainer(160, 90);

    const originalRO = globalThis.ResizeObserver;
    const callbacks: Array<() => void> = [];

    class StubResizeObserver {
      callback: ResizeObserverCallback;
      observe = vi.fn();
      disconnect = vi.fn();

      constructor(cb: ResizeObserverCallback) {
        this.callback = cb;
        callbacks.push(() => cb([], this as unknown as ResizeObserver));
      }
    }

    const globalWithRO = globalThis as typeof globalThis & {
      ResizeObserver: typeof ResizeObserver;
    };
    globalWithRO.ResizeObserver = StubResizeObserver as unknown as typeof ResizeObserver;

    const scope = effectScope();
    scope.run(() => {
      useAutoresize(chart, autoresize, root);
    });

    chart.value = createChart(resize, () => root.value, container);
    root.value = container;
    await nextTick();

    if (!callbacks[0]) {
      throw new Error("Expected ResizeObserver callback to be registered.");
    }
    callbacks[0]();
    callbacks[0]();
    expect(resize).not.toHaveBeenCalled();

    container.style.width = "200px";
    callbacks[0]();
    callbacks[0]();
    expect(resize).toHaveBeenCalledTimes(1);

    container.style.width = "0";
    callbacks[0]();
    expect(resize).toHaveBeenCalledTimes(1);

    container.style.width = "200px";
    callbacks[0]();
    callbacks[0]();
    expect(resize).toHaveBeenCalledTimes(2);

    scope.stop();
    globalWithRO.ResizeObserver = originalRO;
  });
});
