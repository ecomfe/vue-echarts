import { beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, ref } from "vue";
import type { GraphicContext } from "../src/graphic/runtime";

const flushMicrotasks = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()));
const mockState = vi.hoisted(() => ({
  createCollector: vi.fn(),
  use: vi.fn(),
}));

vi.mock("echarts/core", async () => {
  const actual = await vi.importActual<typeof import("echarts/core")>("echarts/core");
  return {
    ...actual,
    use: mockState.use,
  };
});

vi.mock("../src/graphic/collector", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/graphic/collector")>();
  return {
    ...actual,
    createCollector: (...args: Parameters<typeof actual.createCollector>) => {
      mockState.createCollector();
      return actual.createCollector(...args);
    },
  };
});

type RuntimeModule = typeof import("../src/graphic/runtime");
type ExtensionModule = typeof import("../src/graphic/extension");

let runtimeModule: RuntimeModule;
let extensionModule: ExtensionModule;

function createContext(overrides: Partial<GraphicContext> = {}): GraphicContext {
  return {
    slots: {},
    manualUpdate: ref(false),
    requestUpdate: () => undefined,
    ...overrides,
  } as GraphicContext;
}

beforeEach(async () => {
  mockState.createCollector.mockReset();
  mockState.use.mockReset();
  vi.resetModules();
  runtimeModule = await import("../src/graphic/runtime");
  extensionModule = await import("../src/graphic/extension");
});

describe("graphic runtime", () => {
  it("registers the graphic component and runtime", async () => {
    const { GraphicComponent } = await import("echarts/components");

    extensionModule.registerExtension();

    expect(mockState.use).toHaveBeenCalledTimes(1);
    expect(mockState.use).toHaveBeenCalledWith([GraphicComponent]);

    const scope = effectScope();
    const runtime = scope.run(() => runtimeModule.useRuntime(createContext()));
    expect(runtime).toBeTruthy();
    scope.stop();
  });

  it("keeps option untouched without allocating when graphic slot is absent", () => {
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
    expect(mockState.createCollector).not.toHaveBeenCalled();

    scope.stop();
  });

  it("warns once for manual-update graphic auto refresh and option.graphic override", async () => {
    extensionModule.registerExtension();

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const scope = effectScope();
    const requestUpdate = vi.fn();

    try {
      const context = createContext({
        slots: { graphic: () => null } as any,
        manualUpdate: ref(true) as any,
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

      collector.register({
        id: "n1",
        type: "rect",
        parentId: null,
        props: {},
        handlers: {},
        sourceId: 1,
      });

      await flushMicrotasks();
      expect(requestUpdate).not.toHaveBeenCalled();

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

    try {
      (globalThis as { HTMLImageElement?: unknown }).HTMLImageElement = class {};
      (globalThis as { HTMLCanvasElement?: unknown }).HTMLCanvasElement = class {};
      (globalThis as { HTMLVideoElement?: unknown }).HTMLVideoElement = class {};

      vi.resetModules();
      mockState.use.mockReset();

      const runtime = await import("../src/graphic/runtime");
      const { GraphicComponent } = await import("echarts/components");
      await import("../src/graphic/index");

      const scope = effectScope();
      const graphicRuntime = scope.run(() => runtime.useRuntime(createContext()));
      expect(graphicRuntime).toBeTruthy();
      expect(mockState.use).toHaveBeenCalledWith([GraphicComponent]);
      scope.stop();
    } finally {
      (globalThis as { HTMLImageElement?: unknown }).HTMLImageElement = originalImage;
      (globalThis as { HTMLCanvasElement?: unknown }).HTMLCanvasElement = originalCanvas;
      (globalThis as { HTMLVideoElement?: unknown }).HTMLVideoElement = originalVideo;
    }
  });
});
