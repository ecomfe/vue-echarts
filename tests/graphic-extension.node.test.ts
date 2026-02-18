import { beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref } from "vue";
import type { GraphicContext } from "../src/graphic/runtime";

const flushMicrotasks = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()));

type RuntimeModule = typeof import("../src/graphic/runtime");
type ExtensionModule = typeof import("../src/graphic/extension");

let runtimeModule: RuntimeModule;
let extensionModule: ExtensionModule;

function createContext(overrides: Partial<GraphicContext> = {}): GraphicContext {
  return {
    chart: ref(),
    slots: {},
    manualUpdate: ref(false),
    requestUpdate: () => true,
    ...overrides,
  } as GraphicContext;
}

beforeEach(async () => {
  vi.resetModules();
  runtimeModule = await import("../src/graphic/runtime");
  extensionModule = await import("../src/graphic/extension");
});

describe("graphic runtime", () => {
  it("keeps first runtime registration", () => {
    const first = () => ({
      patchOption: (option: any) => ({ ...option, tag: "first" }),
      render: () => null,
    });
    const second = () => ({
      patchOption: (option: any) => ({ ...option, tag: "second" }),
      render: () => null,
    });

    runtimeModule.registerRuntime(first as any);
    runtimeModule.registerRuntime(second as any);

    const scope = effectScope();
    const runtime = scope.run(() => runtimeModule.useRuntime(createContext()));
    if (!runtime) {
      throw new Error("Expected runtime to be initialized.");
    }

    expect(runtime.patchOption({}).tag).toBe("first");
    scope.stop();
  });

  it("registers only once when called repeatedly", () => {
    extensionModule.registerExtension();
    extensionModule.registerExtension();

    const scope = effectScope();
    const runtime = scope.run(() => runtimeModule.useRuntime(createContext()));
    expect(runtime).toBeTruthy();
    scope.stop();
  });

  it("auto-registers GraphicComponent when extension is registered", async () => {
    vi.resetModules();

    const use = vi.fn();
    const graphicComponent = Symbol("GraphicComponent");

    vi.doMock("echarts/core", async () => {
      const actual = await vi.importActual<typeof import("echarts/core")>("echarts/core");
      return {
        ...actual,
        use,
      };
    });

    vi.doMock("echarts/components", async () => {
      const actual =
        await vi.importActual<typeof import("echarts/components")>("echarts/components");
      return {
        ...actual,
        GraphicComponent: graphicComponent as any,
      };
    });

    try {
      const mod = await import("../src/graphic/extension");
      mod.registerExtension();
      mod.registerExtension();

      expect(use).toHaveBeenCalledTimes(1);
      expect(use).toHaveBeenCalledWith([graphicComponent]);
    } finally {
      vi.doUnmock("echarts/core");
      vi.doUnmock("echarts/components");
    }
  });

  it("keeps option untouched and renders nothing when graphic slot is absent", () => {
    extensionModule.registerExtension();

    const scope = effectScope();
    const context = createContext();

    const runtime = scope.run(() => runtimeModule.useRuntime(context));
    if (!runtime) {
      throw new Error("Expected runtime to be initialized.");
    }

    const option = { title: { text: "no-graphic" } } as any;
    expect(runtime.patchOption(option)).toBe(option);
    expect(runtime.render()).toBeNull();

    scope.stop();
  });

  it("normalizes handlers into graphic onxxx fields", async () => {
    extensionModule.registerExtension();

    const requestUpdate = vi.fn(() => true);
    const scope = effectScope();

    const context = createContext({
      slots: { graphic: () => null } as any,
      requestUpdate,
    });

    const runtime = scope.run(() => runtimeModule.useRuntime(context));
    if (!runtime) {
      throw new Error("Expected runtime to be initialized.");
    }

    const vnode = runtime.render() as any;
    const collector = vnode.props.collector as {
      register: (node: any) => void;
      unregister: (id: string) => void;
    };

    const onClickA = vi.fn();
    const onClickB = vi.fn();
    const onClickOnce = vi.fn();
    const onMouseover = vi.fn();
    const onMouseenter = vi.fn();

    collector.register({
      id: "n1",
      type: "rect",
      parentId: null,
      props: {},
      handlers: {
        onClick: [onClickA, "invalid", onClickB],
        onClickOnce,
        onMouseover,
        onMouseenter,
        onDblclick: 123,
        on: () => void 0,
        foo: () => void 0,
      },
      sourceId: 1,
    });

    await flushMicrotasks();

    expect(requestUpdate).toHaveBeenCalledWith({
      replaceMerge: ["graphic"],
    });

    const patchedA = runtime.patchOption({} as any) as any;
    const childA = patchedA.graphic.elements[0].children[0];

    expect(typeof childA.onclick).toBe("function");
    expect(typeof childA.onmouseover).toBe("function");
    expect(typeof childA.onmouseenter).toBe("function");
    expect(childA.ondblclick).toBeUndefined();

    childA.onclick({});
    childA.onclick({ foo: 1 });
    childA.onmouseenter({});
    expect(onClickA).toHaveBeenCalledTimes(2);
    expect(onClickB).toHaveBeenCalledTimes(2);
    expect(onClickOnce).toHaveBeenCalledTimes(1);
    expect(onMouseenter).toHaveBeenCalledTimes(1);

    collector.register({
      id: "n1",
      type: "rect",
      parentId: null,
      props: {},
      handlers: {
        onMouseover,
      },
      sourceId: 1,
    });

    await flushMicrotasks();

    const patchedB = runtime.patchOption({} as any) as any;
    const childB = patchedB.graphic.elements[0].children[0];
    expect(childB.onclick).toBeUndefined();
    expect(typeof childB.onmouseover).toBe("function");

    scope.stop();
  });

  it("does not depend on chart instance for handler option output", async () => {
    extensionModule.registerExtension();

    const chartRef = ref<any>(undefined);
    const scope = effectScope();

    const context = createContext({
      chart: chartRef as any,
      slots: { graphic: () => null } as any,
    });

    const runtime = scope.run(() => runtimeModule.useRuntime(context));
    if (!runtime) {
      throw new Error("Expected runtime to be initialized.");
    }

    const vnode = runtime.render() as any;
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

    const patchedA = runtime.patchOption({} as any) as any;
    const childA = patchedA.graphic.elements[0].children[0];
    expect(typeof childA.onclick).toBe("function");

    const chart = {
      getZr: vi.fn(() => ({
        on: vi.fn(),
        off: vi.fn(),
      })),
    };
    chartRef.value = chart;
    await nextTick();

    chartRef.value = undefined;
    await nextTick();

    const patchedB = runtime.patchOption({} as any) as any;
    const childB = patchedB.graphic.elements[0].children[0];
    expect(typeof childB.onclick).toBe("function");

    scope.stop();
  });

  it("keeps handlers scoped per element option", async () => {
    extensionModule.registerExtension();

    const scope = effectScope();

    const context = createContext({
      slots: { graphic: () => null } as any,
    });

    const runtime = scope.run(() => runtimeModule.useRuntime(context));
    if (!runtime) {
      throw new Error("Expected runtime to be initialized.");
    }

    const vnode = runtime.render() as any;
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

    const patched = runtime.patchOption({} as any) as any;
    const children = patched.graphic.elements[0].children as Array<Record<string, unknown>>;
    const elementA = children.find((item) => item.id === "a");
    const elementB = children.find((item) => item.id === "b");
    if (!elementA || !elementB) {
      throw new Error("Expected graphic child elements to exist.");
    }

    (elementA.onclick as (...args: unknown[]) => void)({ value: "a" });
    (elementB.onclick as (...args: unknown[]) => void)({ value: "b" });
    expect(onClickA).toHaveBeenCalledTimes(1);
    expect(onClickB).toHaveBeenCalledTimes(1);

    scope.stop();
  });

  it("keeps update scheduling stable when handlers are unchanged", async () => {
    extensionModule.registerExtension();

    const requestUpdate = vi.fn(() => true);
    const scope = effectScope();

    const context = createContext({
      slots: { graphic: () => null } as any,
      requestUpdate,
    });

    const runtime = scope.run(() => runtimeModule.useRuntime(context));
    if (!runtime) {
      throw new Error("Expected runtime to be initialized.");
    }

    const vnode = runtime.render() as any;
    const collector = vnode.props.collector as {
      register: (node: any) => void;
    };
    const onClick = vi.fn();

    collector.register({
      id: "n1",
      type: "rect",
      parentId: null,
      props: { x: 1 },
      handlers: { onClick },
      sourceId: 1,
    });
    await flushMicrotasks();

    collector.register({
      id: "n1",
      type: "rect",
      parentId: null,
      props: { x: 2 },
      handlers: { onClick },
      sourceId: 1,
    });
    await flushMicrotasks();

    expect(requestUpdate).toHaveBeenCalledTimes(2);

    const patched = runtime.patchOption({} as any) as any;
    const child = patched.graphic.elements[0].children[0];
    expect(typeof child.onclick).toBe("function");
    expect(child.shape).toMatchObject({ x: 2 });

    scope.stop();
  });

  it("warns once for manual-update graphic auto refresh and option.graphic override", async () => {
    extensionModule.registerExtension();

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const scope = effectScope();

    try {
      const context = createContext({
        slots: { graphic: () => null } as any,
        manualUpdate: ref(true) as any,
        requestUpdate: () => false,
      });

      const runtime = scope.run(() => runtimeModule.useRuntime(context));
      if (!runtime) {
        throw new Error("Expected runtime to be initialized.");
      }

      const vnode = runtime.render() as any;
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

      const patchedA = runtime.patchOption({ graphic: { elements: [{ id: "a" }] } } as any);
      const patchedB = runtime.patchOption({ graphic: { elements: [{ id: "b" }] } } as any);

      expect(
        warnSpy.mock.calls.filter((call: unknown[]) => String(call[0]).includes("option.graphic"))
          .length,
      ).toBe(1);
      expect(
        warnSpy.mock.calls.filter((call: unknown[]) => String(call[0]).includes("manual-update"))
          .length,
      ).toBe(1);
      expect(patchedA.graphic).toBeTruthy();
      expect(patchedB.graphic).toBeTruthy();
    } finally {
      warnSpy.mockRestore();
      scope.stop();
    }
  });

  it("registers runtime via graphic entry side effect", async () => {
    const originalImage = (globalThis as { HTMLImageElement?: unknown }).HTMLImageElement;
    const originalCanvas = (globalThis as { HTMLCanvasElement?: unknown }).HTMLCanvasElement;
    const originalVideo = (globalThis as { HTMLVideoElement?: unknown }).HTMLVideoElement;
    const use = vi.fn();
    const graphicComponent = Symbol("GraphicComponent");

    try {
      (globalThis as { HTMLImageElement?: unknown }).HTMLImageElement = class {};
      (globalThis as { HTMLCanvasElement?: unknown }).HTMLCanvasElement = class {};
      (globalThis as { HTMLVideoElement?: unknown }).HTMLVideoElement = class {};

      vi.resetModules();
      vi.doMock("echarts/core", async () => {
        const actual = await vi.importActual<typeof import("echarts/core")>("echarts/core");
        return {
          ...actual,
          use,
        };
      });
      vi.doMock("echarts/components", async () => {
        const actual =
          await vi.importActual<typeof import("echarts/components")>("echarts/components");
        return {
          ...actual,
          GraphicComponent: graphicComponent as any,
        };
      });

      const runtime = await import("../src/graphic/runtime");
      await import("../src/graphic/index");

      const scope = effectScope();
      const graphicRuntime = scope.run(() => runtime.useRuntime(createContext()));
      expect(graphicRuntime).toBeTruthy();
      expect(use).toHaveBeenCalledWith([graphicComponent]);
      scope.stop();
    } finally {
      vi.doUnmock("echarts/core");
      vi.doUnmock("echarts/components");
      (globalThis as { HTMLImageElement?: unknown }).HTMLImageElement = originalImage;
      (globalThis as { HTMLCanvasElement?: unknown }).HTMLCanvasElement = originalCanvas;
      (globalThis as { HTMLVideoElement?: unknown }).HTMLVideoElement = originalVideo;
    }
  });
});
