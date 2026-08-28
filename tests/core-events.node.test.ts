import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope, reactive, ref } from "vue";

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

function createChartStub() {
  const zr = createEmitterStub();
  const chart = {
    on: vi.fn(),
    off: vi.fn(),
    getZr: vi.fn(() => zr),
  } as unknown as EChartsType;

  return { chart, zr };
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
  const chart = ref<EChartsType | undefined>();
  const scope = effectScope();
  const stop = scope.run(() => useReactiveChartListeners(chart, attrs))!;
  stops.push(() => scope.stop());
  chart.value = target.chart;
  return { chart, stop, target };
}

describe("core events", () => {
  afterEach(() => {
    for (const stop of stops) {
      stop();
    }
    stops.length = 0;
  });

  it("projects native listeners onto the root element", () => {
    const attrs = reactive<Record<string, unknown>>({
      class: "chart",
      onClick: vi.fn(),
      "onNative:click": vi.fn(),
      "onNative:": vi.fn(),
    });
    const scope = effectScope();
    stops.push(() => scope.stop());
    const rootAttrs = scope.run(() => useRootAttrs(attrs))!;

    expect(rootAttrs.value).toEqual({
      class: "chart",
      "on:click": attrs["onNative:click"],
    });

    attrs["onNative:clickOnce"] = vi.fn();
    expect(rootAttrs.value["on:clickOnce"]).toBe(attrs["onNative:clickOnce"]);
  });

  it("binds chart and ZRender listeners and replaces changed handlers", () => {
    const first = vi.fn();
    const second = vi.fn();
    const move = vi.fn();
    const attrs = reactive<Record<string, unknown>>({
      onDataZoom: first,
      "onZr:mouseMove": move,
      "onNative:click": vi.fn(),
    });
    const { target } = bindListeners(attrs);
    const emitter = target.chart as unknown as EmitterStub;

    expect(emitter.on).toHaveBeenCalledWith("datazoom", expect.any(Function));
    expect(target.zr.on).toHaveBeenCalledWith("mousemove", expect.any(Function));
    expect(emitter.on).toHaveBeenCalledTimes(1);

    const dataZoom = findBoundHandler(emitter, "datazoom");
    emitter.on.mockClear();
    emitter.off.mockClear();
    attrs.onDataZoom = second;

    expect(emitter.off).toHaveBeenCalledWith("datazoom", dataZoom);
    expect(emitter.on).toHaveBeenCalledWith("datazoom", expect.any(Function));
    findBoundHandler(emitter, "datazoom")("updated");
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith("updated");

    const mouseMove = findBoundHandler(target.zr, "mousemove");
    delete attrs["onZr:mouseMove"];
    expect(target.zr.off).toHaveBeenCalledWith("mousemove", mouseMove);
  });

  it("keeps mutable handler arrays live and rebinds after they become empty", () => {
    const first = vi.fn();
    const second = vi.fn();
    const handlers = reactive<EventHandler[]>([first]);
    const attrs = reactive<Record<string, unknown>>({ onClick: handlers });
    const { target } = bindListeners(attrs);
    const emitter = target.chart as unknown as EmitterStub;
    const initial = findBoundHandler(emitter, "click");

    handlers[0] = second;
    initial("updated");
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith("updated");

    handlers.length = 0;
    expect(emitter.off).toHaveBeenCalledWith("click", initial);

    emitter.on.mockClear();
    handlers.push(first);
    const rebound = findBoundHandler(emitter, "click");
    rebound("rebound");
    expect(first).toHaveBeenCalledWith("rebound");
  });

  it("keeps once listeners consumed until their source changes", () => {
    const first = vi.fn();
    const second = vi.fn();
    const attrs = reactive<Record<string, unknown>>({ onClickOnce: first });
    const initial = createChartStub();
    const { chart } = bindListeners(attrs, initial);
    const initialEmitter = initial.chart as unknown as EmitterStub;
    const once = findBoundHandler(initialEmitter, "click");

    once("first");
    expect(first).toHaveBeenCalledWith("first");
    expect(initialEmitter.off).toHaveBeenCalledWith("click", once);

    initialEmitter.on.mockClear();
    attrs.class = "unrelated";
    expect(initialEmitter.on).not.toHaveBeenCalled();

    const replacement = createChartStub();
    chart.value = replacement.chart;
    expect((replacement.chart as unknown as EmitterStub).on).not.toHaveBeenCalled();

    attrs.onClickOnce = second;
    const rebound = findBoundHandler(replacement.chart as unknown as EmitterStub, "click");
    rebound("second");
    expect(second).toHaveBeenCalledWith("second");
  });

  it("moves bindings between chart instances and stops terminally", () => {
    const attrs = reactive<Record<string, unknown>>({ onClick: vi.fn() });
    const first = createChartStub();
    const { chart, stop } = bindListeners(attrs, first);
    const firstEmitter = first.chart as unknown as EmitterStub;
    const firstBinding = findBoundHandler(firstEmitter, "click");
    const second = createChartStub();

    chart.value = second.chart;
    expect(firstEmitter.off).toHaveBeenCalledWith("click", firstBinding);
    expect((second.chart as unknown as EmitterStub).on).toHaveBeenCalledWith(
      "click",
      expect.any(Function),
    );

    const secondBinding = findBoundHandler(second.chart as unknown as EmitterStub, "click");
    stop();
    expect((second.chart as unknown as EmitterStub).off).toHaveBeenCalledWith(
      "click",
      secondBinding,
    );

    const third = createChartStub();
    chart.value = third.chart;
    expect((third.chart as unknown as EmitterStub).on).not.toHaveBeenCalled();
  });
});
