import { describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, reactive, ref } from "vue";

import { useReactiveChartListeners, useRootAttrs } from "../src/core/events";
import type { EChartsType } from "../src/types";

type EventHandler = (...args: unknown[]) => void;

type EmitterStub = {
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
};

function createEmitterStub(): EmitterStub {
  return {
    on: vi.fn(),
    off: vi.fn(),
  };
}

function findBoundHandler(mockFn: ReturnType<typeof vi.fn>, event: string): EventHandler {
  const call = [...mockFn.mock.calls].reverse().find((entry) => entry[0] === event);
  if (!call) {
    throw new Error(`Expected handler for event: ${event}`);
  }
  return call[1] as EventHandler;
}

function createChartStub() {
  const zr = createEmitterStub();
  const getZr = vi.fn(() => zr);
  const chart = {
    on: vi.fn(),
    off: vi.fn(),
    getZr,
  } as unknown as EChartsType;

  return {
    chart,
    getZr,
    zr,
  };
}

describe("core events", () => {
  it("maps native attrs and ignores unsupported native payloads", async () => {
    const attrs = reactive<Record<string, unknown>>({
      class: "chart",
      onClick: vi.fn(),
      "onNative:click": vi.fn(),
      "onNative:": vi.fn(),
    });

    const scope = effectScope();
    const rootAttrs = scope.run(() => useRootAttrs(attrs));
    if (!rootAttrs) {
      throw new Error("Expected computed attrs to be available.");
    }

    expect(rootAttrs.value).toEqual({
      class: "chart",
      "on:click": attrs["onNative:click"],
    });

    attrs["onNative:clickOnce"] = vi.fn();
    await nextTick();

    expect(rootAttrs.value).toMatchObject({
      "on:click": attrs["onNative:click"],
      "on:clickOnce": attrs["onNative:clickOnce"],
    });

    scope.stop();
  });

  it("uses the latest handlers when an array mutates in place", async () => {
    const chartRef = ref<EChartsType | undefined>();
    const first = vi.fn();
    const second = vi.fn();
    const handlers = reactive<EventHandler[]>([first]);
    const attrs = reactive<Record<string, unknown>>({ onClick: handlers });
    const target = createChartStub();
    const emitter = target.chart as unknown as EmitterStub;

    const scope = effectScope();
    scope.run(() => {
      useReactiveChartListeners(chartRef, attrs);
    });

    chartRef.value = target.chart;
    await nextTick();

    const firstBinding = findBoundHandler(emitter.on, "click");
    firstBinding("first");
    expect(first).toHaveBeenCalledWith("first");

    handlers[0] = second;
    await nextTick();

    firstBinding("second");
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledWith("second");

    scope.stop();
  });

  it("normalizes camel-case chart and ZRender event names", async () => {
    const chartRef = ref<EChartsType | undefined>();
    const attrs = reactive<Record<string, unknown>>({
      onMouseMove: vi.fn(),
      onDataZoom: vi.fn(),
      onBrushEnd: vi.fn(),
      onShowTip: vi.fn(),
      onUpdateAxisPointer: vi.fn(),
      "onZr:mouseMove": vi.fn(),
    });
    const target = createChartStub();
    const emitter = target.chart as unknown as EmitterStub;

    const scope = effectScope();
    scope.run(() => {
      useReactiveChartListeners(chartRef, attrs);
    });

    chartRef.value = target.chart;
    await nextTick();

    expect(emitter.on.mock.calls.map(([event]) => event)).toEqual([
      "mousemove",
      "datazoom",
      "brushend",
      "showtip",
      "updateaxispointer",
    ]);
    expect(target.zr.on).toHaveBeenCalledWith("mousemove", expect.any(Function));

    scope.stop();
  });

  it.each(["onClick", "onClickOnce"])(
    "unbinds and rebinds %s when its array is emptied in place",
    async (key) => {
      const chartRef = ref<EChartsType | undefined>();
      const handler = vi.fn();
      const handlers = reactive<EventHandler[]>([handler]);
      const attrs = reactive<Record<string, unknown>>({ [key]: handlers });
      const target = createChartStub();
      const emitter = target.chart as unknown as EmitterStub;

      const scope = effectScope();
      scope.run(() => {
        useReactiveChartListeners(chartRef, attrs);
      });

      chartRef.value = target.chart;
      await nextTick();

      const initialBinding = findBoundHandler(emitter.on, "click");
      handlers.length = 0;
      await nextTick();

      expect(emitter.off).toHaveBeenCalledWith("click", initialBinding);

      emitter.on.mockClear();
      handlers.push(handler);
      await nextTick();

      const rebound = findBoundHandler(emitter.on, "click");
      rebound("payload");
      rebound("again");

      expect(handler).toHaveBeenCalledTimes(key === "onClickOnce" ? 1 : 2);

      scope.stop();
    },
  );

  it("binds, diffs, and cleans chart/zr listeners reactively", async () => {
    const chartRef = ref<EChartsType | undefined>();
    const attrs = reactive<Record<string, unknown>>({
      "onZr:": vi.fn(),
      "onZr:mouseup": ["invalid"],
    });

    const first = createChartStub();
    const second = createChartStub();

    const scope = effectScope();
    scope.run(() => {
      useReactiveChartListeners(chartRef, attrs);
    });

    chartRef.value = first.chart;
    await nextTick();

    expect((first.chart as unknown as EmitterStub).on).not.toHaveBeenCalled();
    expect(first.zr.on).not.toHaveBeenCalled();

    attrs.onClick = vi.fn();
    attrs["onZr:mouseMove"] = vi.fn();
    await nextTick();

    expect((first.chart as unknown as EmitterStub).on).toHaveBeenCalledWith(
      "click",
      expect.any(Function),
    );
    expect(first.zr.on).toHaveBeenCalledWith("mousemove", expect.any(Function));

    const firstClickBinding = findBoundHandler((first.chart as unknown as EmitterStub).on, "click");
    const firstMoveBinding = findBoundHandler(first.zr.on, "mousemove");
    (first.chart as unknown as EmitterStub).on.mockClear();
    (first.chart as unknown as EmitterStub).off.mockClear();
    first.getZr.mockClear();
    first.zr.on.mockClear();
    first.zr.off.mockClear();

    attrs.class = "noop";
    await nextTick();

    expect((first.chart as unknown as EmitterStub).on).not.toHaveBeenCalled();
    expect((first.chart as unknown as EmitterStub).off).not.toHaveBeenCalled();
    expect(first.getZr).not.toHaveBeenCalled();
    expect(first.zr.on).not.toHaveBeenCalled();
    expect(first.zr.off).not.toHaveBeenCalled();

    const nextClick = vi.fn();
    attrs.onClick = nextClick;
    await nextTick();

    expect((first.chart as unknown as EmitterStub).off).not.toHaveBeenCalled();
    expect((first.chart as unknown as EmitterStub).on).not.toHaveBeenCalled();
    firstClickBinding("updated");
    expect(nextClick).toHaveBeenCalledWith("updated");

    const mixedClick = vi.fn();
    attrs.onClick = [mixedClick, "invalid"]; // mixed arrays: keep function entries only
    await nextTick();
    expect((first.chart as unknown as EmitterStub).on).not.toHaveBeenCalled();
    firstClickBinding("mixed");
    expect(mixedClick).toHaveBeenCalledWith("mixed");

    attrs.onClick = ["invalid-only"]; // no valid handlers: remove binding without re-add
    await nextTick();
    expect((first.chart as unknown as EmitterStub).off).toHaveBeenCalledWith(
      "click",
      firstClickBinding,
    );

    const beforeRemoveCalls = first.zr.off.mock.calls.length;
    delete attrs["onZr:mouseMove"];
    await nextTick();
    expect(first.zr.off.mock.calls.length).toBeGreaterThan(beforeRemoveCalls);
    expect(first.zr.off).toHaveBeenCalledWith("mousemove", firstMoveBinding);

    attrs.onClickOnce = vi.fn();
    await nextTick();

    const onceBinding = findBoundHandler((first.chart as unknown as EmitterStub).on, "click");
    onceBinding("a");
    onceBinding("b");
    expect(attrs.onClickOnce).toHaveBeenCalledTimes(1);
    expect((first.chart as unknown as EmitterStub).off).toHaveBeenCalledWith("click", onceBinding);

    chartRef.value = second.chart;
    await nextTick();

    // The component listener remains consumed when only its internal emitter changes.
    expect((second.chart as unknown as EmitterStub).on).not.toHaveBeenCalled();

    chartRef.value = undefined;
    await nextTick();

    scope.stop();
  });

  it("supports mixed once handlers, detaches before invocation, and rebinds", async () => {
    const chartRef = ref<EChartsType | undefined>();
    const error = new Error("listener failed");
    const fnA = vi.fn();
    const fnB = vi.fn();
    const fnC = vi.fn(() => {
      throw error;
    });
    const attrs = reactive<Record<string, unknown>>({
      onClickOnce: [fnA, "invalid", fnB],
    });

    const target = createChartStub();
    const scope = effectScope();
    scope.run(() => {
      useReactiveChartListeners(chartRef, attrs);
    });

    chartRef.value = target.chart;
    await nextTick();

    const firstOnceBinding = findBoundHandler((target.chart as unknown as EmitterStub).on, "click");
    firstOnceBinding("first");
    firstOnceBinding("again");
    expect(fnA).toHaveBeenCalledTimes(1);
    expect(fnB).toHaveBeenCalledTimes(1);
    expect((target.chart as unknown as EmitterStub).off).toHaveBeenCalledWith(
      "click",
      firstOnceBinding,
    );

    (target.chart as unknown as EmitterStub).on.mockClear();
    (target.chart as unknown as EmitterStub).off.mockClear();

    attrs.onClickOnce = [fnC];
    await nextTick();

    expect((target.chart as unknown as EmitterStub).off).not.toHaveBeenCalled();
    expect((target.chart as unknown as EmitterStub).on).toHaveBeenCalledWith(
      "click",
      expect.any(Function),
    );

    const secondOnceBinding = findBoundHandler(
      (target.chart as unknown as EmitterStub).on,
      "click",
    );
    expect(() => secondOnceBinding("second")).toThrow(error);
    expect(() => secondOnceBinding("second-again")).not.toThrow();
    expect(fnC).toHaveBeenCalledTimes(1);
    expect((target.chart as unknown as EmitterStub).off).toHaveBeenCalledWith(
      "click",
      secondOnceBinding,
    );

    scope.stop();
    expect((target.chart as unknown as EmitterStub).off).toHaveBeenCalledTimes(1);
  });
});
