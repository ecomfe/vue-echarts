import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope, h, nextTick, ref, shallowRef } from "vue";
import { init, use } from "echarts/core";
import { BarChart } from "echarts/charts";
import { GridComponent } from "echarts/components";
import { CanvasRenderer, SVGRenderer } from "echarts/renderers";
import ECharts, { type Exposed } from "../src/ECharts";
import { useAutoresize } from "../src/composables/autoresize";
import type { AutoResize, EChartsType, InitOptions } from "../src/types";
import { createSizedContainer, flushAnimationFrame } from "./helpers/dom";
import { render } from "./helpers/testing";

use([BarChart, GridComponent, CanvasRenderer, SVGRenderer]);

const cleanups: Array<() => void> = [];

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) {
    cleanup();
  }
});

// A second frame lets the preceding frame's ResizeObserver delivery finish.
async function flushObserver() {
  await flushAnimationFrame();
  await flushAnimationFrame();
}

describe.each(["canvas", "svg"] as const)("native %s autoresize", (renderer) => {
  function mount(options: InitOptions = {}, wait = 0) {
    const container = createSizedContainer(361.1875, 200.1875);
    const chart = init(container, undefined, { renderer, ...options });
    const resize = vi.spyOn(chart, "resize");
    const resizeRenderer = vi.spyOn(chart.getZr(), "resize");
    const onResize = vi.fn();
    const autoresize = shallowRef<AutoResize>({ throttle: wait, onResize });
    const scope = effectScope();
    const instance = shallowRef<EChartsType>();
    scope.run(() => useAutoresize(instance, autoresize, shallowRef(container)));
    instance.value = chart;
    cleanups.push(() => {
      scope.stop();
      chart.dispose();
    });
    return { container, chart, resize, resizeRenderer, onResize, autoresize, scope };
  }

  it.each([0, 100])(
    "preserves the initial bar animation with %d ms throttling",
    async (throttle) => {
      const onResize = vi.fn();
      const frames: number[] = [];
      const finished = vi.fn();
      await render(() =>
        h(ECharts, {
          style: { width: "361.1875px", height: "200.1875px" },
          initOptions: { renderer },
          autoresize: { throttle, onResize },
          option: {
            animationDuration: 500,
            animationEasing: "linear",
            xAxis: { type: "category", data: ["A", "B"] },
            yAxis: {},
            series: [{ type: "bar", data: [10, 20] }],
          },
          onRendered: () => frames.push(performance.now()),
          onFinished: finished,
        }),
      );
      await expect.poll(() => finished.mock.calls.length, { timeout: 3000 }).toBeGreaterThan(0);
      expect(onResize).not.toHaveBeenCalled();
      expect(frames.length).toBeGreaterThan(5);
      expect(frames.at(-1)! - frames[0]!).toBeGreaterThan(350);
    },
  );

  it("skips unchanged fractions but catches subpixel changes across integer boundaries", async () => {
    const { container, chart, resize, resizeRenderer, onResize } = mount();
    await flushObserver();
    expect(resize).not.toHaveBeenCalled();
    expect(resizeRenderer).not.toHaveBeenCalled();

    container.style.width = "361.3125px";
    container.style.height = "200.3125px";
    await flushObserver();
    expect(resize).not.toHaveBeenCalled();
    expect(resizeRenderer).not.toHaveBeenCalled();

    container.style.width = "361.75px";
    container.style.height = "200.75px";
    await expect.poll(() => [chart.getWidth(), chart.getHeight()]).toEqual([362, 201]);
    expect(resize).toHaveBeenCalledOnce();
    expect(onResize).toHaveBeenCalledOnce();
  });

  it("handles a size change before the first observer notification", async () => {
    const { container, chart, resize } = mount();
    container.style.width = "400.75px";
    await expect.poll(() => chart.getWidth()).toBe(401);
    expect(resize).toHaveBeenCalledOnce();
  });

  it("updates series layout and media options when the native size changes", async () => {
    const { container, chart, onResize } = mount();
    chart.setOption({
      animation: false,
      grid: { left: 0, right: 0, top: 0, bottom: 0, outerBoundsMode: "none" },
      xAxis: { type: "category", data: ["A", "B"], boundaryGap: true, show: false },
      yAxis: { min: 0, max: 100, show: false },
      series: [{ type: "bar", data: [50, 50] }],
      media: [{ query: { minWidth: 400 }, option: { grid: { right: 100 } } }],
    });
    await flushObserver();
    expect(chart.convertToPixel({ xAxisIndex: 0 }, "B")).toBe(270.75);
    expect(onResize).not.toHaveBeenCalled();

    container.style.width = "500.75px";
    await expect.poll(() => chart.convertToPixel({ xAxisIndex: 0 }, "B")).toBe(300.75);
    expect(onResize).toHaveBeenCalledOnce();
  });

  it.each(["content-box", "border-box"] as const)(
    "resizes through public root styles with %s padding, borders and overflow",
    async (boxSizing) => {
      const exposed = shallowRef<Exposed>();
      const padding = ref(0);
      const width = ref(361.1875);
      const onResize = vi.fn();
      await render(() =>
        h(ECharts, {
          ref: exposed,
          initOptions: { renderer },
          autoresize: { throttle: 0, onResize },
          style: {
            width: `${width.value}px`,
            height: "200.1875px",
            padding: `${padding.value}px`,
            border: "2px solid transparent",
            boxSizing,
            overflow: "auto",
          },
        }),
      );
      await flushObserver();
      const instance = exposed.value!;
      const dimensions = () => [instance.getWidth(), instance.getHeight()];
      const borderBox = boxSizing === "border-box";
      expect(dimensions()).toEqual(borderBox ? [357, 196] : [361, 200]);
      expect(onResize).not.toHaveBeenCalled();
      const outerWidth = instance.root!.offsetWidth;
      const resizeRenderer = vi.spyOn(instance.getZr(), "resize");

      padding.value = 10.75;
      await nextTick();
      await flushObserver();
      expect(dimensions()).toEqual(borderBox ? [336, 175] : [361, 200]);
      expect(onResize).toHaveBeenCalledTimes(borderBox ? 1 : 0);
      if (borderBox) {
        expect(instance.root!.offsetWidth).toBe(outerWidth);
      } else {
        expect(resizeRenderer).not.toHaveBeenCalled();
      }

      padding.value = 11.25;
      await nextTick();
      await flushObserver();
      expect(dimensions()).toEqual(borderBox ? [335, 174] : [361, 200]);
      expect(onResize).toHaveBeenCalledTimes(borderBox ? 2 : 0);

      width.value = 400.75;
      await expect.poll(dimensions).toEqual(borderBox ? [374, 174] : [401, 200]);
      expect(onResize).toHaveBeenCalledTimes(borderBox ? 3 : 1);
    },
  );

  it("keeps native explicit dimensions, including dimensions set by manual resize", async () => {
    const { container, chart, resize, resizeRenderer, onResize } = mount({ width: 180.5 });
    await flushObserver();
    expect(resize).not.toHaveBeenCalled();
    expect(resizeRenderer).toHaveBeenCalledOnce();
    container.style.width = "420px";
    container.style.height = "240px";
    await expect.poll(() => chart.getHeight()).toBe(240);
    expect(chart.getWidth()).toBe(180.5);
    expect(onResize).toHaveBeenCalledOnce();

    chart.resize({ width: 160.25, height: 100.75 });
    resize.mockClear();
    container.style.width = "450px";
    container.style.height = "260px";
    await flushObserver();
    expect([chart.getWidth(), chart.getHeight()]).toEqual([160.25, 100.75]);
    expect(resize).not.toHaveBeenCalled();

    chart.resize({ width: "auto", height: "auto" });
    resize.mockClear();
    container.style.width = "480px";
    await expect.poll(() => chart.getWidth()).toBe(480);
    expect(resize).toHaveBeenCalledOnce();
  });

  it("skips hidden containers and resizes after recovery", async () => {
    const { container, chart, resize } = mount();
    await flushObserver();
    resize.mockClear();
    container.style.display = "none";
    container.style.width = "420.75px";
    await flushObserver();
    expect(resize).not.toHaveBeenCalled();
    expect(chart.getWidth()).toBe(361);
    container.style.display = "block";
    await expect.poll(() => chart.getWidth()).toBe(421);
    expect(resize).toHaveBeenCalledOnce();
  });

  it("does not repeat manual resizing before observer delivery", async () => {
    const { container, chart, resize, resizeRenderer, onResize } = mount();
    await flushObserver();
    container.style.width = "420.75px";
    chart.resize();
    resize.mockClear();
    resizeRenderer.mockClear();
    await flushObserver();
    expect(resize).not.toHaveBeenCalled();
    expect(resizeRenderer).not.toHaveBeenCalled();
    expect(onResize).not.toHaveBeenCalled();
  });

  it("resynchronizes after re-enabling without resizing an unchanged fractional host", async () => {
    const { container, chart, resize, resizeRenderer, autoresize } = mount();
    await flushObserver();
    autoresize.value = false;
    autoresize.value = { throttle: 0 };
    await nextTick();
    await flushObserver();
    expect(resize).not.toHaveBeenCalled();
    expect(resizeRenderer).not.toHaveBeenCalled();
    autoresize.value = false;
    container.style.width = "420.75px";
    await flushObserver();
    expect(chart.getWidth()).toBe(361);
    autoresize.value = { throttle: 0 };
    await expect.poll(() => chart.getWidth()).toBe(421);
    expect(resize).toHaveBeenCalledOnce();
  });

  it("rechecks native dimensions after throttling and cancels pending work", async () => {
    const { container, chart, resize, resizeRenderer, onResize, scope } = mount({}, 200);
    await flushObserver();
    resize.mockClear();
    container.style.width = "420.75px";
    await expect.poll(() => chart.getWidth()).toBe(421);
    onResize.mockClear();
    resize.mockClear();

    container.style.width = "450.75px";
    await flushObserver();
    chart.resize();
    resize.mockClear();
    resizeRenderer.mockClear();
    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(resize).not.toHaveBeenCalled();
    expect(resizeRenderer).not.toHaveBeenCalled();
    expect(onResize).not.toHaveBeenCalled();

    container.style.width = "480.75px";
    await expect.poll(() => chart.getWidth()).toBe(481);
    container.style.width = "500.75px";
    await flushObserver();
    scope.stop();
    resize.mockClear();
    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(resize).not.toHaveBeenCalled();
  });
});
