import { describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, reactive, ref } from "vue";

import { useReactiveChartListeners, useReactiveEventAttrs } from "../src/core/events";
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
  const chart = {
    on: vi.fn(),
    off: vi.fn(),
    getZr: vi.fn(() => zr),
  } as unknown as EChartsType;

  return {
    chart,
    zr,
  };
}

describe("core events", () => {
  it("maps native attrs and ignores unsupported native payloads", async () => {
    const attrs = reactive<Record<string, unknown>>({
      class: "chart",
      onClick: vi.fn(),
      "onNative:click": vi.fn(),
      "onNative:Once": vi.fn(),
    });

    const scope = effectScope();
    const state = scope.run(() => useReactiveEventAttrs(attrs));
    if (!state) {
      throw new Error("Expected computed attrs to be available.");
    }

    expect(state.nonEventAttrs.value).toEqual({ class: "chart" });
    expect(state.nativeListeners.value).toEqual({
      onClick: attrs["onNative:click"],
    });

    attrs["onNative:clickOnce"] = vi.fn();
    await nextTick();

    expect(state.nativeListeners.value).toMatchObject({
      onClick: attrs["onNative:click"],
      onClickOnce: attrs["onNative:clickOnce"],
    });

    scope.stop();
  });

  it("binds, diffs, and cleans chart/zr listeners reactively", async () => {
    const chartRef = ref<EChartsType | undefined>();
    const attrs = reactive<Record<string, unknown>>({
      onClick: vi.fn(),
      "onZr:mousemove": vi.fn(),
      onMouseup: ["invalid"],
    });

    const first = createChartStub();
    const second = createChartStub();

    const scope = effectScope();
    scope.run(() => {
      useReactiveChartListeners(chartRef, attrs);
    });

    chartRef.value = first.chart;
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
    first.zr.on.mockClear();
    first.zr.off.mockClear();

    attrs.class = "noop";
    await nextTick();

    expect((first.chart as unknown as EmitterStub).on).not.toHaveBeenCalled();
    expect((first.chart as unknown as EmitterStub).off).not.toHaveBeenCalled();
    expect(first.zr.on).not.toHaveBeenCalled();
    expect(first.zr.off).not.toHaveBeenCalled();

    attrs.onClick = vi.fn();
    await nextTick();

    expect((first.chart as unknown as EmitterStub).off).toHaveBeenCalledWith(
      "click",
      firstClickBinding,
    );
    expect((first.chart as unknown as EmitterStub).on).toHaveBeenCalledWith(
      "click",
      expect.any(Function),
    );

    attrs.onClick = [vi.fn(), "invalid"]; // mixed arrays: keep function entries only
    await nextTick();
    expect((first.chart as unknown as EmitterStub).on).toHaveBeenCalled();

    attrs.onClick = ["invalid-only"]; // no valid handlers: remove binding without re-add
    await nextTick();

    const beforeRemoveCalls = first.zr.off.mock.calls.length;
    delete attrs["onZr:mousemove"];
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

    expect((second.chart as unknown as EmitterStub).on).toHaveBeenCalled();

    chartRef.value = undefined;
    await nextTick();

    scope.stop();
  });

  it("supports once handlers declared as mixed arrays and rebinds on updates", async () => {
    const chartRef = ref<EChartsType | undefined>();
    const fnA = vi.fn();
    const fnB = vi.fn();
    const fnC = vi.fn();
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

    expect((target.chart as unknown as EmitterStub).off).toHaveBeenCalledWith(
      "click",
      firstOnceBinding,
    );
    expect((target.chart as unknown as EmitterStub).on).toHaveBeenCalledWith(
      "click",
      expect.any(Function),
    );

    const secondOnceBinding = findBoundHandler(
      (target.chart as unknown as EmitterStub).on,
      "click",
    );
    secondOnceBinding("second");
    secondOnceBinding("second-again");
    expect(fnC).toHaveBeenCalledTimes(1);
    expect((target.chart as unknown as EmitterStub).off).toHaveBeenCalledWith(
      "click",
      secondOnceBinding,
    );

    scope.stop();
  });
});
