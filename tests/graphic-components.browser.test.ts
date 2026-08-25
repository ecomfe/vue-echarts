import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, provide, ref, shallowRef } from "vue";
import type { LinearGradientObject, PatternObject } from "echarts";

import { render } from "./helpers/testing";
import { withConsoleWarn } from "./helpers/dom";
import { GRAPHIC_COLLECTOR_KEY, GRAPHIC_PARENT_ID_KEY } from "../src/graphic/context";
import { GArc, GCircle, GGroup, GImage, GPolyline, GRect, GText } from "../src/graphic/components";
import { GraphicMount } from "../src/graphic/mount";

type CollectorMock = {
  beginPass: ReturnType<typeof vi.fn>;
  register: ReturnType<typeof vi.fn>;
  unregister: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  requestFlush: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
  getNodes: () => Iterable<unknown>;
};

function createCollectorMock(): CollectorMock {
  return {
    beginPass: vi.fn(),
    register: vi.fn(),
    unregister: vi.fn(),
    warn: vi.fn(),
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

function getLastRegisterPayload(collector: CollectorMock): any {
  const lastCall = collector.register.mock.calls.at(-1);
  if (!lastCall) {
    throw new Error("Expected collector.register to be called at least once.");
  }
  return lastCall[0];
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

  it("uses vnode key as id and forwards common props", async () => {
    const collector = createCollectorMock();
    const keyframeAnimation = [
      { duration: 1000, keyframes: [{ percent: 1, x: 20 }] },
      { duration: 1000, keyframes: [{ percent: 1, rotation: 1 }] },
    ];

    const Root = withGraphicProvider(collector, () =>
      h(GRect, {
        key: "rect-key",
        name: "main-rect",
        tooltip: { show: true },
        shape: { x: 1, y: 2, width: 3, height: 4 },
        style: { fill: "#0ea5e9" },
        keyframeAnimation,
        onClick: () => void 0,
      }),
    );

    withConsoleWarn((warnSpy) => {
      render(Root);
      expect(
        warnSpy.mock.calls.some((call: unknown[]) =>
          String(call[0]).includes('type check failed for prop "keyframeAnimation"'),
        ),
      ).toBe(false);
    });
    await nextTick();

    expect(collector.register).toHaveBeenCalled();
    const payload = getLastRegisterPayload(collector);
    expect(payload.id).toBe("rect-key");
    expect(payload.props.name).toBe("main-rect");
    expect(payload.props.tooltip).toEqual({ show: true });
    expect(payload.handlers).toMatchObject({ onClick: expect.any(Function) });
    expect(payload.props.shape).toMatchObject({ x: 1, y: 2, width: 3, height: 4 });
    expect(payload.props.style).toMatchObject({ fill: "#0ea5e9" });
    expect(payload.props.keyframeAnimation).toBe(keyframeAnimation);
  });

  it("evaluates nested group slots once without updating stable children", async () => {
    const collector = createCollectorMock();
    const renderTick = ref(0);
    const groupSlot = vi.fn(() => [h(GRect, { id: "child" }), `tick-${renderTick.value}`]);
    const Root = defineComponent({
      setup() {
        return () =>
          h(
            GraphicMount,
            { collector: collector as any },
            {
              default: () => h(GGroup, { id: "group" }, { default: groupSlot }),
            },
          );
      },
    });

    render(Root);
    await nextTick();

    expect(groupSlot).toHaveBeenCalledOnce();

    groupSlot.mockClear();
    collector.register.mockClear();
    renderTick.value++;
    await nextTick();

    expect(groupSlot).toHaveBeenCalledOnce();
    expect(collector.register.mock.calls.map(([node]) => node.id)).toEqual(["group"]);
  });

  it("accepts media elements from another document", async () => {
    const collector = createCollectorMock();
    const iframe = document.body.appendChild(document.createElement("iframe"));
    const ownerDocument = iframe.contentDocument;
    if (!ownerDocument) {
      throw new Error("Expected iframe document to be available.");
    }
    const media = [
      ownerDocument.createElement("img"),
      ownerDocument.createElement("canvas"),
      ownerDocument.createElement("video"),
    ];
    const crop = { sx: 1, sy: 2, sWidth: 30, sHeight: 40 };
    const Root = withGraphicProvider(collector, () =>
      media.map((image, index) => h(GImage, { id: index, image, ...crop })),
    );

    try {
      withConsoleWarn((warnSpy) => {
        render(Root);
        expect(
          warnSpy.mock.calls.some((call: unknown[]) =>
            String(call[0]).includes('type check failed for prop "image"'),
          ),
        ).toBe(false);
      });
      await nextTick();

      expect(collector.register.mock.calls.map(([node]) => node.props.image)).toEqual(media);
      expect(getLastRegisterPayload(collector).props).toMatchObject(crop);
    } finally {
      iframe.remove();
    }
  });

  it("accepts native graphic paint controls", async () => {
    const collector = createCollectorMock();
    const fill: LinearGradientObject = {
      type: "linear",
      x: 0,
      y: 0,
      x2: 1,
      y2: 0,
      colorStops: [
        { offset: 0, color: "#0ea5e9" },
        { offset: 1, color: "#22c55e" },
      ],
    };
    const stroke: PatternObject = { image: "pattern.png", repeat: "repeat" };
    const paint = {
      fill,
      stroke,
      decal: stroke,
      strokePercent: 0,
      strokeFirst: false,
      lineDash: false,
      strokeNoScale: false,
      fillOpacity: 0.5,
      strokeOpacity: 0.75,
    } as const;
    const Root = withGraphicProvider(collector, () => h(GRect, { id: "paint", ...paint }));

    withConsoleWarn((warnSpy) => {
      render(Root);
      expect(
        warnSpy.mock.calls.some((call: unknown[]) =>
          String(call[0]).includes("type check failed for prop"),
        ),
      ).toBe(false);
    });
    await nextTick();

    const props = getLastRegisterPayload(collector).props;
    expect(props).toMatchObject(paint);
  });

  it("validates array radii only for rectangles", async () => {
    const collector = createCollectorMock();
    const Root = withGraphicProvider(collector, () => [
      h(GRect, { id: "rect", r: [2, 4] }),
      h(GCircle, { id: "circle", r: [2, 4] as unknown as number }),
    ]);

    withConsoleWarn((warnSpy) => {
      render(Root);
      const radiusWarnings = warnSpy.mock.calls.filter((call: unknown[]) =>
        String(call[0]).includes('type check failed for prop "r"'),
      );
      expect(radiusWarnings).toHaveLength(1);
    });
    await nextTick();
  });

  it("accepts native text styles", async () => {
    const collector = createCollectorMock();
    const textStyle = {
      backgroundColor: { image: "texture.png" },
      padding: [2, 4],
      margin: 3,
      borderColor: "#334155",
      borderWidth: 1,
      borderRadius: [2, 4],
      borderDash: false as const,
      borderDashOffset: 2,
      rich: { accent: { fill: "#0ea5e9" } },
      placeholder: "…",
      truncateMinChar: 2,
    };
    const Root = withGraphicProvider(collector, () =>
      h(GText, { id: "text-box", text: "Label", ...textStyle }),
    );

    withConsoleWarn((warnSpy) => {
      render(Root);
      expect(
        warnSpy.mock.calls.some((call: unknown[]) =>
          String(call[0]).includes("type check failed for prop"),
        ),
      ).toBe(false);
    });
    await nextTick();

    expect(getLastRegisterPayload(collector).props).toMatchObject(textStyle);
  });

  it("preserves zrender defaults until explicitly overridden", async () => {
    const collector = createCollectorMock();

    const Root = withGraphicProvider(collector, () => [
      h(GRect, { id: "defaults" }),
      h(GRect, {
        id: "flags",
        silent: false,
        draggable: true,
        ignore: false,
        invisible: true,
        clipPath: false,
      }),
      h(GPolyline, { id: "smooth-default" }),
      h(GPolyline, { id: "smooth-explicit", smooth: false }),
      h(GArc, { id: "default" }),
      h(GArc, { id: "counterclockwise", clockwise: false }),
      h(GArc, { id: "clockwise", clockwise: true }),
    ]);

    render(Root);
    await nextTick();

    const propsById = Object.fromEntries(
      collector.register.mock.calls.map(([node]) => [node.id, node.props]),
    );
    expect(propsById.defaults).toMatchObject({
      silent: undefined,
      draggable: undefined,
      ignore: undefined,
      invisible: undefined,
      clipPath: undefined,
      autoBatch: undefined,
      lineDash: undefined,
      borderDash: undefined,
      strokeNoScale: undefined,
      strokeFirst: undefined,
    });
    expect(propsById.flags).toMatchObject({
      silent: false,
      draggable: true,
      ignore: false,
      invisible: true,
      clipPath: false,
    });
    expect(propsById["smooth-default"].smooth).toBeUndefined();
    expect(propsById["smooth-explicit"].smooth).toBe(false);
    expect(propsById.default.clockwise).toBeUndefined();
    expect(propsById.counterclockwise.clockwise).toBe(false);
    expect(propsById.clockwise.clockwise).toBe(true);
  });

  it("generates fallback id and warns when both id and key are missing", async () => {
    const collector = createCollectorMock();

    const Root = withGraphicProvider(collector, () => h(GRect));

    render(Root);
    await nextTick();

    const payload = getLastRegisterPayload(collector);
    expect(payload.id).toMatch(/^__ve_graphic_/);
    expect(collector.warn).toHaveBeenCalledWith(
      expect.stringContaining("missing `id` and `key`"),
      expect.stringMatching(/^missing-id:/),
    );
  });

  it("unregisters an empty-string id when it changes", async () => {
    const collector = createCollectorMock();
    const id = ref("");

    const Root = withGraphicProvider(collector, () => h(GRect, { id: id.value }));

    render(Root);
    await nextTick();

    id.value = "rect-b";
    await nextTick();

    expect(collector.unregister).toHaveBeenCalledWith("", expect.any(Number));
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

    const payload = getLastRegisterPayload(collector);
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

  it("unregisters an empty-string id during unmount", async () => {
    const collector = createCollectorMock();
    const visible = ref(true);

    const Root = withGraphicProvider(collector, () =>
      visible.value ? h(GRect, { id: "" }) : null,
    );

    render(Root);
    await nextTick();

    visible.value = false;
    await nextTick();

    expect(collector.unregister).toHaveBeenCalledWith("", expect.any(Number));
  });
});
