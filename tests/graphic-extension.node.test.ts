import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref } from "vue";

import {
  __resetVChartExtensions,
  useVChartExtensions,
  type VChartExtensionContext,
} from "../src/extensions";
import { registerGraphicExtension } from "../src/graphic/extension";

const flushMicrotasks = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()));

function createContext(overrides: Partial<VChartExtensionContext> = {}): VChartExtensionContext {
  return {
    chart: ref(),
    slots: {},
    manualUpdate: ref(false),
    requestUpdate: () => true,
    warn: () => void 0,
    ...overrides,
  } as VChartExtensionContext;
}

afterEach(() => {
  __resetVChartExtensions();
});

describe("graphic extension", () => {
  it("keeps option untouched and renders nothing when graphic slot is absent", () => {
    registerGraphicExtension();

    const scope = effectScope();
    const context = createContext();

    const extensions = scope.run(() => useVChartExtensions(context));
    if (!extensions) {
      throw new Error("Expected extensions to be initialized.");
    }

    const option = { title: { text: "no-graphic" } } as any;
    expect(extensions.patchOption(option)).toBe(option);
    expect(extensions.render()).toEqual([]);

    scope.stop();
  });

  it("normalizes handlers and syncs chart event bindings", async () => {
    registerGraphicExtension();

    const warn = vi.fn();
    const requestUpdate = vi.fn(() => true);
    const chartRef = ref<any>(undefined);
    const scope = effectScope();

    const context = createContext({
      chart: chartRef as any,
      slots: { graphic: () => null } as any,
      warn,
      requestUpdate,
    });

    const extensions = scope.run(() => useVChartExtensions(context));
    if (!extensions) {
      throw new Error("Expected extensions to be initialized.");
    }

    const vnode = extensions.render()[0] as any;
    const collector = vnode.props.collector as {
      register: (node: any) => void;
    };

    const onClickA = vi.fn();
    const onClickB = vi.fn();
    const onMouseenter = vi.fn();

    collector.register({
      id: "n1",
      type: "rect",
      parentId: null,
      props: {},
      handlers: {
        onClick: [onClickA, "invalid", onClickB],
        onMouseenter,
        onDblclick: 123,
        on: () => void 0,
        foo: () => void 0,
      },
      sourceId: 1,
    });

    await flushMicrotasks();

    expect(requestUpdate).toHaveBeenCalledWith({
      updateOptions: {
        replaceMerge: ["graphic"],
      },
    });

    const chart1 = {
      on: vi.fn(),
      off: vi.fn(),
    };
    chartRef.value = chart1;
    await nextTick();

    expect(chart1.on).toHaveBeenCalledWith("click", expect.any(Function));
    expect(chart1.on).toHaveBeenCalledWith("mouseenter", expect.any(Function));

    const clickBinding = chart1.on.mock.calls.find(
      (call: unknown[]) => call[0] === "click",
    )?.[1] as (params: unknown) => void;
    if (!clickBinding) {
      throw new Error("Expected click binding to exist.");
    }

    clickBinding({});
    clickBinding({ info: { __veGraphicId: "missing" } });
    clickBinding({ info: { __veGraphicId: "n1" } });
    expect(onClickA).toHaveBeenCalledTimes(1);
    expect(onClickB).toHaveBeenCalledTimes(1);

    collector.register({
      id: "n1",
      type: "rect",
      parentId: null,
      props: {},
      handlers: {
        onMouseenter,
      },
      sourceId: 1,
    });

    await flushMicrotasks();
    expect(chart1.off).toHaveBeenCalledWith("click", expect.any(Function));

    const chart2 = {
      on: vi.fn(),
      off: vi.fn(),
    };
    chartRef.value = chart2;
    await nextTick();

    expect(chart1.off).toHaveBeenCalled();
    expect(chart2.on).toHaveBeenCalledWith("mouseenter", expect.any(Function));
    expect(warn).not.toHaveBeenCalled();

    scope.stop();
  });

  it("unbinds all bound events when chart instance is cleared", async () => {
    registerGraphicExtension();

    const chartRef = ref<any>(undefined);
    const scope = effectScope();

    const context = createContext({
      chart: chartRef as any,
      slots: { graphic: () => null } as any,
    });

    const extensions = scope.run(() => useVChartExtensions(context));
    if (!extensions) {
      throw new Error("Expected extensions to be initialized.");
    }

    const vnode = extensions.render()[0] as any;
    const collector = vnode.props.collector as {
      register: (node: any) => void;
    };

    collector.register({
      id: "n1",
      type: "rect",
      parentId: null,
      props: {},
      handlers: {
        onClick: () => void 0,
      },
      sourceId: 1,
    });
    await flushMicrotasks();

    const chart = {
      on: vi.fn(),
      off: vi.fn(),
    };
    chartRef.value = chart;
    await nextTick();

    const clickHandler = chart.on.mock.calls.find((call: unknown[]) => call[0] === "click")?.[1];
    expect(clickHandler).toBeTypeOf("function");

    chartRef.value = undefined;
    await nextTick();

    expect(chart.off).toHaveBeenCalledWith("click", clickHandler);
    scope.stop();
  });

  it("dispatches events to matching graphic id only", async () => {
    registerGraphicExtension();

    const chartRef = ref<any>(undefined);
    const scope = effectScope();

    const context = createContext({
      chart: chartRef as any,
      slots: { graphic: () => null } as any,
    });

    const extensions = scope.run(() => useVChartExtensions(context));
    if (!extensions) {
      throw new Error("Expected extensions to be initialized.");
    }

    const vnode = extensions.render()[0] as any;
    const collector = vnode.props.collector as {
      register: (node: any) => void;
    };

    const onClickA = vi.fn();
    const onClickB = vi.fn();

    collector.register({
      id: "a",
      type: "rect",
      parentId: null,
      props: {},
      handlers: { onClick: onClickA },
      sourceId: 1,
    });
    collector.register({
      id: "b",
      type: "rect",
      parentId: null,
      props: {},
      handlers: { onClick: onClickB },
      sourceId: 2,
    });
    await flushMicrotasks();

    const chart = {
      on: vi.fn(),
      off: vi.fn(),
    };
    chartRef.value = chart;
    await nextTick();

    const clickHandler = chart.on.mock.calls.find(
      (call: unknown[]) => call[0] === "click",
    )?.[1] as (params: unknown) => void;
    if (!clickHandler) {
      throw new Error("Expected click handler to be bound.");
    }

    clickHandler({ info: { __veGraphicId: "b" } });
    expect(onClickA).not.toHaveBeenCalled();
    expect(onClickB).toHaveBeenCalledTimes(1);

    scope.stop();
  });

  it("warns once for manual-update graphic auto refresh and option.graphic override", async () => {
    registerGraphicExtension();

    const warn = vi.fn();
    const scope = effectScope();

    const context = createContext({
      slots: { graphic: () => null } as any,
      manualUpdate: ref(true) as any,
      requestUpdate: () => false,
      warn,
    });

    const extensions = scope.run(() => useVChartExtensions(context));
    if (!extensions) {
      throw new Error("Expected extensions to be initialized.");
    }

    const vnode = extensions.render()[0] as any;
    const collector = vnode.props.collector as {
      register: (node: any) => void;
    };

    collector.register({
      id: "n1",
      type: "rect",
      parentId: null,
      props: {},
      handlers: {},
      sourceId: 1,
    });

    await flushMicrotasks();

    const patchedA = extensions.patchOption({ graphic: { elements: [{ id: "a" }] } } as any);
    const patchedB = extensions.patchOption({ graphic: { elements: [{ id: "b" }] } } as any);

    expect(
      warn.mock.calls.filter((call: unknown[]) => String(call[0]).includes("option.graphic"))
        .length,
    ).toBe(1);
    expect(
      warn.mock.calls.filter((call: unknown[]) => String(call[0]).includes("manual-update")).length,
    ).toBe(1);
    expect(patchedA.graphic).toBeTruthy();
    expect(patchedB.graphic).toBeTruthy();

    scope.stop();
  });

  it("registers extension via graphic entry side effect", async () => {
    const originalImage = (globalThis as { HTMLImageElement?: unknown }).HTMLImageElement;
    const originalCanvas = (globalThis as { HTMLCanvasElement?: unknown }).HTMLCanvasElement;
    const originalVideo = (globalThis as { HTMLVideoElement?: unknown }).HTMLVideoElement;

    try {
      (globalThis as { HTMLImageElement?: unknown }).HTMLImageElement = class {};
      (globalThis as { HTMLCanvasElement?: unknown }).HTMLCanvasElement = class {};
      (globalThis as { HTMLVideoElement?: unknown }).HTMLVideoElement = class {};

      await import("../src/graphic/index");

      const scope = effectScope();
      const extensions = scope.run(() => useVChartExtensions(createContext()));
      if (!extensions) {
        throw new Error("Expected extensions to be initialized.");
      }

      expect(extensions.count).toBeGreaterThan(0);
      scope.stop();
    } finally {
      (globalThis as { HTMLImageElement?: unknown }).HTMLImageElement = originalImage;
      (globalThis as { HTMLCanvasElement?: unknown }).HTMLCanvasElement = originalCanvas;
      (globalThis as { HTMLVideoElement?: unknown }).HTMLVideoElement = originalVideo;
    }
  });
});
