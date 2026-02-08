import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, provide, ref, shallowRef } from "vue";

import { render } from "./helpers/testing";
import { withConsoleWarn } from "./helpers/dom";
import { GRAPHIC_COLLECTOR_KEY, GRAPHIC_PARENT_ID_KEY } from "../src/graphic/context";
import { GGroup, GRect } from "../src/graphic/components";

type CollectorMock = {
  beginPass: ReturnType<typeof vi.fn>;
  register: ReturnType<typeof vi.fn>;
  unregister: ReturnType<typeof vi.fn>;
  warnOnce: ReturnType<typeof vi.fn>;
  requestFlush: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
  getNodes: () => Iterable<unknown>;
};

function createCollectorMock(): CollectorMock {
  return {
    beginPass: vi.fn(),
    register: vi.fn(),
    unregister: vi.fn(),
    warnOnce: vi.fn(),
    requestFlush: vi.fn(),
    dispose: vi.fn(),
    getNodes: () => [],
  };
}

function withGraphicProvider(collector: CollectorMock, renderChild: () => any) {
  return defineComponent({
    setup() {
      const parentId = shallowRef<string | null>(null);
      provide(GRAPHIC_COLLECTOR_KEY, collector as any);
      provide(GRAPHIC_PARENT_ID_KEY, parentId);
      return () => h("div", renderChild());
    },
  });
}

function withCollectorOnly(collector: CollectorMock, renderChild: () => any) {
  return defineComponent({
    setup() {
      provide(GRAPHIC_COLLECTOR_KEY, collector as any);
      return () => h("div", renderChild());
    },
  });
}

describe("graphic components", () => {
  it("warns when component is used outside #graphic slot", async () => {
    const Root = defineComponent({
      setup() {
        return () => h(GRect, { id: "x" });
      },
    });

    withConsoleWarn((warnSpy) => {
      render(Root);
      const hasWarning = warnSpy.mock.calls.some((call: unknown[]) =>
        String(call[0]).includes("must be used inside `#graphic` slot"),
      );
      expect(hasWarning).toBe(true);
    });

    await nextTick();
  });

  it("uses vnode key as id and extracts handler props", async () => {
    const collector = createCollectorMock();

    const Root = withGraphicProvider(collector, () =>
      h(GRect, {
        key: "rect-key",
        shape: { x: 1, y: 2, width: 3, height: 4 },
        style: { fill: "#0ea5e9" },
        onClick: () => void 0,
      }),
    );

    render(Root);
    await nextTick();

    expect(collector.register).toHaveBeenCalled();
    const payload = collector.register.mock.calls.at(-1)?.[0] as any;
    expect(payload.id).toBe("rect-key");
    expect(payload.handlers).toMatchObject({ onClick: expect.any(Function) });
    expect(payload.props.shape).toMatchObject({ x: 1, y: 2, width: 3, height: 4 });
    expect(payload.props.style).toMatchObject({ fill: "#0ea5e9" });
  });

  it("generates fallback id and warns when both id and key are missing", async () => {
    const collector = createCollectorMock();

    const Root = withGraphicProvider(collector, () => h(GRect));

    render(Root);
    await nextTick();

    const payload = collector.register.mock.calls.at(-1)?.[0] as any;
    expect(payload.id).toMatch(/^__ve_graphic_/);
    expect(collector.warnOnce).toHaveBeenCalledWith(
      expect.stringMatching(/^missing-id:/),
      expect.stringContaining("missing `id` and `key`"),
    );
  });

  it("unregisters previous node when id changes", async () => {
    const collector = createCollectorMock();
    const id = ref("rect-a");

    const Root = withGraphicProvider(collector, () => h(GRect, { id: id.value }));

    render(Root);
    await nextTick();

    id.value = "rect-b";
    await nextTick();

    expect(collector.unregister).toHaveBeenCalledWith("rect-a", expect.any(Number));
  });

  it("provides group parent id to descendants and handles empty default slot", async () => {
    const collector = createCollectorMock();

    const Root = withGraphicProvider(collector, () => [
      h(
        GGroup,
        { id: "group-root" },
        {
          default: () => [h(GRect, { id: "child-rect" })],
        },
      ),
      h(GGroup, { id: "group-empty" }),
    ]);

    render(Root);
    await nextTick();

    const calls = collector.register.mock.calls.map((entry) => entry[0] as any);
    const child = calls.find((entry) => entry.id === "child-rect");
    expect(child.parentId).toBe("group-root");
    expect(calls.some((entry) => entry.id === "group-empty")).toBe(true);
  });

  it("falls back to null parent id when parent context is not provided", async () => {
    const collector = createCollectorMock();

    const Root = withCollectorOnly(collector, () => h(GRect, { id: "solo" }));

    render(Root);
    await nextTick();

    const payload = collector.register.mock.calls.at(-1)?.[0] as any;
    expect(payload.parentId).toBeNull();
  });

  it("unregisters node when component is unmounted by v-if", async () => {
    const collector = createCollectorMock();
    const visible = ref(true);

    const Root = withGraphicProvider(collector, () =>
      visible.value ? h(GRect, { id: "toggle-node" }) : null,
    );

    render(Root);
    await nextTick();

    visible.value = false;
    await nextTick();

    expect(collector.unregister).toHaveBeenCalledWith("toggle-node", expect.any(Number));
  });
});
