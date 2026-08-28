import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope, reactive, ref } from "vue";

import { useReactiveChartListeners } from "../src/core/events";
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

function createChartStub() {
  const zr = createEmitterStub();
  return {
    ...createEmitterStub(),
    getZr: vi.fn(() => zr),
  } as unknown as EChartsType & EmitterStub;
}

function findBoundHandler(emitter: EmitterStub, event: string): EventHandler {
  const call = [...emitter.on.mock.calls].reverse().find(([name]) => name === event);
  if (!call) {
    throw new Error(`Expected handler for event: ${event}`);
  }
  return call[1] as EventHandler;
}

const stops: Array<() => void> = [];

function bindListeners(attrs: Record<string, unknown>, target = createChartStub()) {
  const chartRef = ref<EChartsType | undefined>();
  const scope = effectScope();
  scope.run(() => useReactiveChartListeners(chartRef, attrs));
  stops.push(() => scope.stop());
  chartRef.value = target;
  return { chartRef, target };
}

describe("core events", () => {
  afterEach(() => {
    for (const stop of stops) {
      stop();
    }
    stops.length = 0;
  });

  it("rebinds mutable handler arrays after they become empty", () => {
    const handlers = reactive<EventHandler[]>([vi.fn()]);
    const attrs = reactive<Record<string, unknown>>({ onClick: handlers });
    const { target } = bindListeners(attrs);
    const emitter = target;
    const initial = findBoundHandler(emitter, "click");

    emitter.on.mockClear();
    emitter.off.mockClear();
    handlers.push(vi.fn());
    expect(emitter.on).not.toHaveBeenCalled();
    expect(emitter.off).not.toHaveBeenCalled();

    handlers.length = 0;
    expect(emitter.off).toHaveBeenCalledWith("click", initial);

    emitter.on.mockClear();
    handlers.push(vi.fn());
    expect(emitter.on).toHaveBeenCalledWith("click", expect.any(Function));
  });

  it("keeps once listeners consumed until their source changes", () => {
    const first = vi.fn();
    const second = vi.fn();
    const attrs = reactive<Record<string, unknown>>({ onClickOnce: first });
    const initial = createChartStub();
    const { chartRef } = bindListeners(attrs, initial);
    const once = findBoundHandler(initial, "click");

    once("first");
    expect(first).toHaveBeenCalledWith("first");
    expect(initial.off).toHaveBeenCalledWith("click", once);

    const replacement = createChartStub();
    chartRef.value = replacement;
    expect(replacement.on).not.toHaveBeenCalled();

    attrs.onClickOnce = second;
    const rebound = findBoundHandler(replacement, "click");
    rebound("second");
    expect(second).toHaveBeenCalledWith("second");
  });

  it("moves bindings between chart instances", () => {
    const attrs = reactive<Record<string, unknown>>({ onClick: vi.fn() });
    const first = createChartStub();
    const { chartRef } = bindListeners(attrs, first);
    const firstBinding = findBoundHandler(first, "click");
    const second = createChartStub();

    chartRef.value = second;
    expect(first.off).toHaveBeenCalledWith("click", firstBinding);
    expect(second.on).toHaveBeenCalledWith("click", expect.any(Function));
  });
});
