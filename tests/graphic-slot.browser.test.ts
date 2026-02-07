import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, onMounted, ref, shallowRef } from "vue";

import { render } from "./helpers/testing";
import { flushAnimationFrame, withConsoleWarn, withConsoleWarnAsync } from "./helpers/dom";
import { createEChartsModule, enqueueChart, resetECharts } from "./helpers/mock";
import type { ChartStub } from "./helpers/mock";
import type { ComponentExposed } from "vue-component-type-helpers";
import ECharts from "../src/ECharts";
import { __resetVChartExtensions } from "../src/extensions";
import { registerGraphicExtension } from "../src/graphic/extension";
import { GGroup, GRect } from "../src/graphic/components";

vi.mock("echarts/core", () => createEChartsModule());

type Exposed = ComponentExposed<typeof ECharts>;

let chartStub: ChartStub;

beforeEach(() => {
  resetECharts();
  chartStub = enqueueChart();
  __resetVChartExtensions();
});

function getLastGraphicIds(): string[] {
  const optionArg = chartStub.setOption.mock.calls.at(-1)?.[0] as any;
  const children = optionArg?.graphic?.elements?.[0]?.children as
    | Array<{ id?: string }>
    | undefined;
  return (children ?? []).map((item) => String(item.id));
}

function getLastGraphicOption(): any {
  return chartStub.setOption.mock.calls.at(-1)?.[0] as any;
}

function getLastGraphicRootChildren(): Array<Record<string, unknown>> {
  const optionArg = chartStub.setOption.mock.calls.at(-1)?.[0] as any;
  return (optionArg?.graphic?.elements?.[0]?.children ?? []) as Array<Record<string, unknown>>;
}

describe("graphic slot integration", () => {
  it("warns when graphic slot is used without the graphic entry", async () => {
    const option = ref({
      graphic: { elements: [{ type: "rect", id: "from-option", shape: { x: 0, y: 0 } }] },
    });
    const exposed = shallowRef<Exposed>();

    const Root = defineComponent({
      setup() {
        return () =>
          h(
            ECharts,
            { option: option.value, ref: (value) => (exposed.value = value as Exposed) },
            { graphic: () => h("div") },
          );
      },
    });

    withConsoleWarn((warnSpy) => {
      render(Root);
      const hasGraphicHint = warnSpy.mock.calls.some((call: unknown[]) =>
        String(call[0]).includes("Import from `vue-echarts/graphic` to enable it."),
      );
      expect(hasGraphicHint).toBe(true);
    });

    await nextTick();

    expect(chartStub.setOption).toHaveBeenCalledTimes(1);
    expect(chartStub.setOption.mock.calls[0][0]).toMatchObject(option.value);
  });

  it("overrides option.graphic when the graphic entry is registered", async () => {
    registerGraphicExtension();

    const option = ref({
      graphic: { elements: [{ type: "rect", id: "from-option", shape: { x: 0, y: 0 } }] },
    });

    const Root = defineComponent({
      setup() {
        return () =>
          h(
            ECharts,
            { option: option.value },
            {
              graphic: () => h(GRect, { id: "slot-rect", x: 10, y: 10, width: 20, height: 12 }),
            },
          );
      },
    });

    await withConsoleWarnAsync(async (warnSpy) => {
      render(Root);
      await nextTick();
      await flushAnimationFrame();

      const lastCall = chartStub.setOption.mock.calls.at(-1)?.[0] as any;
      expect(lastCall.graphic.elements[0].children[0].id).toBe("slot-rect");
      expect(
        lastCall.graphic.elements[0].children.some((child: any) => child.id === "from-option"),
      ).toBe(false);
      expect(
        warnSpy.mock.calls.some((call: unknown[]) => String(call[0]).includes("option.graphic")),
      ).toBe(true);
    });
  });

  it("reapplies graphic option after theme changes", async () => {
    registerGraphicExtension();

    const option = ref({
      series: [{ type: "line", data: [1, 2, 3] }],
    });
    const theme = ref<any>(undefined);

    const Root = defineComponent({
      setup() {
        return () =>
          h(
            ECharts,
            { option: option.value, theme: theme.value },
            {
              graphic: () => h(GRect, { id: "slot-rect", x: 10, y: 10, width: 20, height: 12 }),
            },
          );
      },
    });

    render(Root);
    await nextTick();
    await flushAnimationFrame();

    chartStub.setOption.mockClear();

    theme.value = { backgroundColor: "#111827" };
    await nextTick();
    await flushAnimationFrame();

    expect(chartStub.setTheme).toHaveBeenCalledWith({ backgroundColor: "#111827" });
    expect(chartStub.setOption).toHaveBeenCalled();
    const [optionArg, updateArg] = chartStub.setOption.mock.calls.at(-1) as [any, any];
    expect(optionArg.graphic.elements[0].children[0].id).toBe("slot-rect");
    expect(updateArg?.replaceMerge).toContain("graphic");
  });

  it("mounts graphic extension before first manual setOption", async () => {
    registerGraphicExtension();

    const exposed = shallowRef<Exposed>();
    const manualOption = ref({
      series: [{ type: "line", data: [3, 5, 2] }],
    });

    const Root = defineComponent({
      setup() {
        onMounted(() => {
          exposed.value?.setOption(manualOption.value);
        });

        return () =>
          h(
            ECharts,
            { manualUpdate: true, ref: (value) => (exposed.value = value as Exposed) },
            {
              graphic: () => h(GRect, { id: "slot-rect", x: 10, y: 10, width: 20, height: 12 }),
            },
          );
      },
    });

    await withConsoleWarnAsync(async (warnSpy) => {
      render(Root);
      await nextTick();
      await flushAnimationFrame();

      expect(chartStub.setOption).toHaveBeenCalledTimes(1);
      const [optionArg] = chartStub.setOption.mock.calls[0] as [any, any];
      expect(optionArg.graphic.elements[0].children[0].id).toBe("slot-rect");
      expect(optionArg.series?.[0]?.data).toEqual([3, 5, 2]);
      expect(
        warnSpy.mock.calls.some((call: unknown[]) => String(call[0]).includes("manual-update")),
      ).toBe(true);
    });
  });

  it("hits manual-update guard when option prop exists", async () => {
    registerGraphicExtension();

    const option = ref({
      series: [{ type: "line", data: [1, 2, 3] }],
    });
    const x = ref(10);

    const Root = defineComponent({
      setup() {
        return () =>
          h(
            ECharts,
            { option: option.value, manualUpdate: true },
            {
              graphic: () =>
                h(GRect, { id: "slot-rect", x: x.value, y: 10, width: 20, height: 12 }),
            },
          );
      },
    });

    await withConsoleWarnAsync(async (warnSpy) => {
      render(Root);
      await nextTick();
      await flushAnimationFrame();

      const initialCalls = chartStub.setOption.mock.calls.length;

      x.value = 22;
      await nextTick();
      await flushAnimationFrame();

      // Slot updates are blocked by manual-update guard and should not trigger auto setOption.
      expect(chartStub.setOption.mock.calls.length).toBe(initialCalls);
      expect(
        warnSpy.mock.calls.some((call: unknown[]) => String(call[0]).includes("manual-update")),
      ).toBe(true);
    });
  });

  it("preserves expected order when a middle node is toggled by v-if", async () => {
    registerGraphicExtension();

    const option = ref({ series: [{ type: "line", data: [1, 2, 3] }] });
    const showB = ref(false);

    const Root = defineComponent({
      setup() {
        return () =>
          h(
            ECharts,
            { option: option.value },
            {
              graphic: () => [
                h(GRect, { id: "a", key: "a", x: 0, y: 0, width: 8, height: 8 }),
                showB.value
                  ? h(GRect, { id: "b", key: "b", x: 10, y: 0, width: 8, height: 8 })
                  : null,
                h(GRect, { id: "c", key: "c", x: 20, y: 0, width: 8, height: 8 }),
              ],
            },
          );
      },
    });

    render(Root);
    await nextTick();
    await flushAnimationFrame();
    expect(getLastGraphicIds()).toEqual(["a", "c"]);

    showB.value = true;
    await nextTick();
    await flushAnimationFrame();
    expect(getLastGraphicIds()).toEqual(["a", "b", "c"]);

    showB.value = false;
    await nextTick();
    await flushAnimationFrame();
    expect(getLastGraphicIds()).toEqual(["a", "c"]);
  });

  it("tracks v-for reorder and removal with stable ids", async () => {
    registerGraphicExtension();

    const option = ref({ series: [{ type: "line", data: [1, 2, 3] }] });
    const items = ref(["a", "b", "c"]);

    const Root = defineComponent({
      setup() {
        return () =>
          h(
            ECharts,
            { option: option.value },
            {
              graphic: () =>
                items.value.map((id, index) =>
                  h(GRect, {
                    id,
                    key: id,
                    x: index * 10,
                    y: 0,
                    width: 8,
                    height: 8,
                  }),
                ),
            },
          );
      },
    });

    render(Root);
    await nextTick();
    await flushAnimationFrame();
    expect(getLastGraphicIds()).toEqual(["a", "b", "c"]);

    items.value = ["c", "a", "b"];
    await nextTick();
    await flushAnimationFrame();
    expect(getLastGraphicIds()).toEqual(["c", "a", "b"]);

    items.value = ["c", "b"];
    await nextTick();
    await flushAnimationFrame();
    expect(getLastGraphicIds()).toEqual(["c", "b"]);
  });

  it("clears graphic when #graphic slot is turned off and restores when turned on again", async () => {
    registerGraphicExtension();

    const option = ref({ series: [{ type: "line", data: [1, 2, 3] }] });
    const showGraphic = ref(true);

    const Root = defineComponent({
      setup() {
        return () => {
          const children = showGraphic.value
            ? {
                graphic: () => h(GRect, { id: "slot-rect", x: 10, y: 10, width: 20, height: 12 }),
              }
            : {};
          return h(ECharts, { option: option.value }, children);
        };
      },
    });

    render(Root);
    await nextTick();
    await flushAnimationFrame();
    expect(getLastGraphicIds()).toEqual(["slot-rect"]);

    showGraphic.value = false;
    await nextTick();
    await flushAnimationFrame();

    const [optionArg, updateArg] = chartStub.setOption.mock.calls.at(-1) as [any, any];
    expect(optionArg.graphic).toBeUndefined();
    expect(updateArg?.replaceMerge).toContain("graphic");

    showGraphic.value = true;
    await nextTick();
    await flushAnimationFrame();
    expect(getLastGraphicIds()).toEqual(["slot-rect"]);
  });

  it("moves nodes across groups when conditional parent changes", async () => {
    registerGraphicExtension();

    const option = ref({ series: [{ type: "line", data: [1, 2, 3] }] });
    const inLeft = ref(true);

    const Root = defineComponent({
      setup() {
        return () =>
          h(
            ECharts,
            { option: option.value },
            {
              graphic: () => [
                h(
                  GGroup,
                  { id: "left" },
                  {
                    default: () =>
                      inLeft.value
                        ? [
                            h(GRect, {
                              id: "moving",
                              key: "moving",
                              x: 0,
                              y: 0,
                              width: 8,
                              height: 8,
                            }),
                          ]
                        : [],
                  },
                ),
                h(
                  GGroup,
                  { id: "right" },
                  {
                    default: () =>
                      inLeft.value
                        ? []
                        : [
                            h(GRect, {
                              id: "moving",
                              key: "moving",
                              x: 20,
                              y: 0,
                              width: 8,
                              height: 8,
                            }),
                          ],
                  },
                ),
              ],
            },
          );
      },
    });

    render(Root);
    await nextTick();
    await flushAnimationFrame();

    let children = getLastGraphicRootChildren();
    let left = children.find((item) => item.id === "left") as any;
    let right = children.find((item) => item.id === "right") as any;
    expect(left.children?.map((node: any) => node.id)).toEqual(["moving"]);
    expect(right.children ?? []).toEqual([]);

    inLeft.value = false;
    await nextTick();
    await flushAnimationFrame();

    children = getLastGraphicRootChildren();
    left = children.find((item) => item.id === "left") as any;
    right = children.find((item) => item.id === "right") as any;
    expect(left.children ?? []).toEqual([]);
    expect(right.children?.map((node: any) => node.id)).toEqual(["moving"]);
  });

  it("warns once when duplicate graphic ids are rendered", async () => {
    registerGraphicExtension();

    const option = ref({ series: [{ type: "line", data: [1, 2, 3] }] });
    const tick = ref(0);

    const Root = defineComponent({
      setup() {
        return () =>
          h(
            ECharts,
            { option: option.value },
            {
              graphic: () => [
                h(GRect, { id: "dup", key: `a-${tick.value}`, x: 0, y: 0, width: 8, height: 8 }),
                h(GRect, { id: "dup", key: `b-${tick.value}`, x: 10, y: 0, width: 8, height: 8 }),
              ],
            },
          );
      },
    });

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      render(Root);
      await nextTick();
      await flushAnimationFrame();

      tick.value++;
      await nextTick();
      await flushAnimationFrame();
      tick.value++;
      await nextTick();
      await flushAnimationFrame();

      const duplicateWarnings = warnSpy.mock.calls.filter((call: unknown[]) =>
        String(call[0]).includes("Duplicate graphic id"),
      );
      expect(duplicateWarnings.length).toBe(1);
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("preserves order for key-only nodes when v-for is reordered", async () => {
    registerGraphicExtension();

    const option = ref({ series: [{ type: "line", data: [1, 2, 3] }] });
    const items = ref(["x", "y", "z"]);

    const Root = defineComponent({
      setup() {
        return () =>
          h(
            ECharts,
            { option: option.value },
            {
              graphic: () =>
                items.value.map((key, index) =>
                  h(GRect, {
                    key,
                    x: index * 10,
                    y: 0,
                    width: 8,
                    height: 8,
                  }),
                ),
            },
          );
      },
    });

    render(Root);
    await nextTick();
    await flushAnimationFrame();
    expect(getLastGraphicIds()).toEqual(["x", "y", "z"]);

    items.value = ["z", "x", "y"];
    await nextTick();
    await flushAnimationFrame();
    expect(getLastGraphicIds()).toEqual(["z", "x", "y"]);
  });

  it("handles primitive slot children and wrapped vnode arrays", async () => {
    registerGraphicExtension();

    const option = ref({ series: [{ type: "line", data: [1, 2, 3] }] });

    const Root = defineComponent({
      setup() {
        return () =>
          h(
            ECharts,
            { option: option.value },
            {
              graphic: () => [
                null,
                "hint",
                h("div", null, [h(GRect, { id: "wrapped", x: 2, y: 2, width: 6, height: 6 })]),
              ],
            },
          );
      },
    });

    render(Root);
    await nextTick();
    await flushAnimationFrame();
    expect(getLastGraphicIds()).toEqual(["wrapped"]);
  });

  it("handles anonymous graphic node without id/key", async () => {
    registerGraphicExtension();

    const option = ref({ series: [{ type: "line", data: [1, 2, 3] }] });

    const Root = defineComponent({
      setup() {
        return () =>
          h(
            ECharts,
            { option: option.value },
            {
              graphic: () => h(GRect, { x: 5, y: 5, width: 8, height: 8 }),
            },
          );
      },
    });

    await withConsoleWarnAsync(async (warnSpy) => {
      render(Root);
      await nextTick();
      await flushAnimationFrame();
      expect(getLastGraphicIds()[0]).toMatch(/^__ve_graphic_/);
      expect(
        warnSpy.mock.calls.some((call: unknown[]) =>
          String(call[0]).includes("missing `id` and `key`"),
        ),
      ).toBe(true);
    });
  });

  it("supports empty graphic slot content", async () => {
    registerGraphicExtension();

    const option = ref({ series: [{ type: "line", data: [1, 2, 3] }] });

    const Root = defineComponent({
      setup() {
        return () =>
          h(
            ECharts,
            { option: option.value },
            {
              graphic: () => undefined,
            },
          );
      },
    });

    render(Root);
    await nextTick();
    await flushAnimationFrame();
    expect(getLastGraphicIds()).toEqual([]);
  });

  it("updates graphic shape/style from reactive bindings in auto mode", async () => {
    registerGraphicExtension();

    const option = ref({ series: [{ type: "line", data: [1, 2, 3] }] });
    const x = ref(10);
    const label = ref("alpha");

    const Root = defineComponent({
      setup() {
        return () =>
          h(
            ECharts,
            { option: option.value },
            {
              graphic: () => [
                h(GRect, {
                  id: "marker",
                  x: x.value,
                  y: 10,
                  width: 20,
                  height: 12,
                  fill: "#22c55e",
                }),
                h(GRect, {
                  id: "marker-bg",
                  x: x.value - 2,
                  y: 8,
                  width: 24,
                  height: 16,
                  fill: "#bfdbfe",
                }),
                h("div", [h("span", label.value)]),
              ],
            },
          );
      },
    });

    render(Root);
    await nextTick();
    await flushAnimationFrame();

    x.value = 36;
    label.value = "beta";
    await nextTick();
    await flushAnimationFrame();

    const graphic = getLastGraphicOption().graphic.elements[0].children as any[];
    const marker = graphic.find((item) => item.id === "marker");
    const markerBg = graphic.find((item) => item.id === "marker-bg");
    expect(marker.shape).toMatchObject({ x: 36 });
    expect(marker.style).toMatchObject({ fill: "#22c55e" });
    expect(markerBg.shape).toMatchObject({ x: 34 });
  });

  it("coalesces multiple reactive graphic changes into one setOption per tick", async () => {
    registerGraphicExtension();

    const option = ref({ series: [{ type: "line", data: [1, 2, 3] }] });
    const x = ref(8);
    const y = ref(10);

    const Root = defineComponent({
      setup() {
        return () =>
          h(
            ECharts,
            { option: option.value },
            {
              graphic: () =>
                h(GRect, { id: "batched", x: x.value, y: y.value, width: 18, height: 10 }),
            },
          );
      },
    });

    render(Root);
    await nextTick();
    await flushAnimationFrame();
    const before = chartStub.setOption.mock.calls.length;

    x.value = 20;
    y.value = 28;
    await nextTick();
    await flushAnimationFrame();

    expect(chartStub.setOption.mock.calls.length).toBe(before + 1);
    const shape = getLastGraphicOption().graphic.elements[0].children[0].shape;
    expect(shape).toMatchObject({ x: 20, y: 28 });
  });

  it("supports reorder with id-only nodes (without :key)", async () => {
    registerGraphicExtension();

    const option = ref({ series: [{ type: "line", data: [1, 2, 3] }] });
    const ids = ref(["a", "b", "c"]);

    const Root = defineComponent({
      setup() {
        return () =>
          h(
            ECharts,
            { option: option.value },
            {
              graphic: () =>
                ids.value.map((id, index) =>
                  h(GRect, {
                    id,
                    x: index * 10,
                    y: 0,
                    width: 8,
                    height: 8,
                  }),
                ),
            },
          );
      },
    });

    render(Root);
    await nextTick();
    await flushAnimationFrame();
    expect(getLastGraphicIds()).toEqual(["a", "b", "c"]);

    ids.value = ["c", "a", "b"];
    await nextTick();
    await flushAnimationFrame();
    expect(getLastGraphicIds()).toEqual(["c", "a", "b"]);
  });

  it("dispatches chart click events to latest reactive handlers", async () => {
    registerGraphicExtension();

    const option = ref({ series: [{ type: "line", data: [1, 2, 3] }] });
    const onClickA = vi.fn();
    const onClickB = vi.fn();
    const currentHandler = ref(onClickA);

    const Root = defineComponent({
      setup() {
        return () =>
          h(
            ECharts,
            { option: option.value },
            {
              graphic: () =>
                h(GRect, {
                  id: "event-node",
                  x: 10,
                  y: 10,
                  width: 12,
                  height: 12,
                  onClick: currentHandler.value,
                }),
            },
          );
      },
    });

    render(Root);
    await nextTick();
    await flushAnimationFrame();

    const clickBinding = chartStub.on.mock.calls.find(
      (call: unknown[]) => call[0] === "click",
    )?.[1] as (params: unknown) => void;
    if (!clickBinding) {
      throw new Error("Expected click binding to exist.");
    }

    const eventA = { info: { __veGraphicId: "event-node" }, value: 1 };
    clickBinding(eventA);
    expect(onClickA).toHaveBeenCalledWith(eventA);
    expect(onClickB).not.toHaveBeenCalled();

    currentHandler.value = onClickB;
    await nextTick();
    await flushAnimationFrame();

    const eventB = { info: { __veGraphicId: "event-node" }, value: 2 };
    clickBinding(eventB);
    expect(onClickA).toHaveBeenCalledTimes(1);
    expect(onClickB).toHaveBeenCalledWith(eventB);
  });

  it("applies latest graphic state on explicit setOption in manual-update mode", async () => {
    registerGraphicExtension();

    const exposed = shallowRef<Exposed>();
    const x = ref(10);
    const data = ref([1, 2, 3]);

    const Root = defineComponent({
      setup() {
        return () =>
          h(
            ECharts,
            { manualUpdate: true, ref: (value) => (exposed.value = value as Exposed) },
            {
              graphic: () =>
                h(GRect, {
                  id: "manual-rect",
                  x: x.value,
                  y: 10,
                  width: 12,
                  height: 12,
                }),
            },
          );
      },
    });

    await withConsoleWarnAsync(async (warnSpy) => {
      render(Root);
      await nextTick();
      await flushAnimationFrame();

      expect(chartStub.setOption).toHaveBeenCalledTimes(0);

      exposed.value?.setOption({ series: [{ type: "line", data: data.value }] });
      await nextTick();
      await flushAnimationFrame();

      let optionArg = chartStub.setOption.mock.calls.at(-1)?.[0] as any;
      expect(optionArg.series[0].data).toEqual([1, 2, 3]);
      expect(optionArg.graphic.elements[0].children[0].shape).toMatchObject({ x: 10, y: 10 });

      chartStub.setOption.mockClear();

      x.value = 42;
      data.value = [7, 8, 9];
      await nextTick();
      await flushAnimationFrame();

      expect(chartStub.setOption).toHaveBeenCalledTimes(0);

      exposed.value?.setOption({ series: [{ type: "line", data: data.value }] });
      await nextTick();
      await flushAnimationFrame();

      optionArg = chartStub.setOption.mock.calls.at(-1)?.[0] as any;
      expect(optionArg.series[0].data).toEqual([7, 8, 9]);
      expect(optionArg.graphic.elements[0].children[0].shape).toMatchObject({ x: 42, y: 10 });
      expect(
        warnSpy.mock.calls.some((call: unknown[]) => String(call[0]).includes("manual-update")),
      ).toBe(true);
    });
  });

  it("rebinds chart events when handler channels are added or removed", async () => {
    registerGraphicExtension();

    const option = ref({ series: [{ type: "line", data: [1, 2, 3] }] });
    const onClick = vi.fn();
    const onMousemove = vi.fn();
    const enableClick = ref(true);
    const enableMousemove = ref(false);

    const Root = defineComponent({
      setup() {
        return () => {
          const listeners = {
            ...(enableClick.value ? { onClick } : {}),
            ...(enableMousemove.value ? { onMousemove } : {}),
          };
          return h(
            ECharts,
            { option: option.value },
            {
              graphic: () =>
                h(GRect, { id: "event-node", x: 12, y: 12, width: 8, height: 8, ...listeners }),
            },
          );
        };
      },
    });

    render(Root);
    await nextTick();
    await flushAnimationFrame();

    const clickBinding = chartStub.on.mock.calls.find(
      (call: unknown[]) => call[0] === "click",
    )?.[1] as (params: unknown) => void;
    if (!clickBinding) {
      throw new Error("Expected click binding to exist.");
    }

    clickBinding({ info: { __veGraphicId: "event-node" }, value: 1 });
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onMousemove).toHaveBeenCalledTimes(0);

    chartStub.on.mockClear();
    chartStub.off.mockClear();

    enableClick.value = false;
    enableMousemove.value = true;
    await nextTick();
    await flushAnimationFrame();

    expect(chartStub.off.mock.calls.some((call: unknown[]) => call[0] === "click")).toBe(true);
    expect(chartStub.on.mock.calls.some((call: unknown[]) => call[0] === "mousemove")).toBe(true);

    clickBinding({ info: { __veGraphicId: "event-node" }, value: 2 });
    expect(onClick).toHaveBeenCalledTimes(1);

    const moveBinding = chartStub.on.mock.calls.find(
      (call: unknown[]) => call[0] === "mousemove",
    )?.[1] as (params: unknown) => void;
    if (!moveBinding) {
      throw new Error("Expected mousemove binding to exist.");
    }

    moveBinding({ info: { __veGraphicId: "event-node" }, value: 3 });
    expect(onMousemove).toHaveBeenCalledTimes(1);

    chartStub.off.mockClear();
    enableMousemove.value = false;
    await nextTick();
    await flushAnimationFrame();

    expect(chartStub.off.mock.calls.some((call: unknown[]) => call[0] === "mousemove")).toBe(true);

    moveBinding({ info: { __veGraphicId: "event-node" }, value: 4 });
    expect(onMousemove).toHaveBeenCalledTimes(1);
  });

  it("updates click handlers in manual-update mode without auto setOption", async () => {
    registerGraphicExtension();

    const onClickA = vi.fn();
    const onClickB = vi.fn();
    const currentHandler = ref(onClickA);

    const Root = defineComponent({
      setup() {
        return () =>
          h(
            ECharts,
            { manualUpdate: true },
            {
              graphic: () =>
                h(GRect, {
                  id: "manual-event-node",
                  x: 8,
                  y: 8,
                  width: 10,
                  height: 10,
                  onClick: currentHandler.value,
                }),
            },
          );
      },
    });

    await withConsoleWarnAsync(async (warnSpy) => {
      render(Root);
      await nextTick();
      await flushAnimationFrame();

      expect(chartStub.setOption).toHaveBeenCalledTimes(0);

      const clickBinding = chartStub.on.mock.calls.find(
        (call: unknown[]) => call[0] === "click",
      )?.[1] as (params: unknown) => void;
      if (!clickBinding) {
        throw new Error("Expected click binding to exist.");
      }

      const eventA = { info: { __veGraphicId: "manual-event-node" }, value: 1 };
      clickBinding(eventA);
      expect(onClickA).toHaveBeenCalledWith(eventA);
      expect(onClickB).not.toHaveBeenCalled();

      currentHandler.value = onClickB;
      await nextTick();
      await flushAnimationFrame();

      expect(chartStub.setOption).toHaveBeenCalledTimes(0);

      const eventB = { info: { __veGraphicId: "manual-event-node" }, value: 2 };
      clickBinding(eventB);
      expect(onClickA).toHaveBeenCalledTimes(1);
      expect(onClickB).toHaveBeenCalledWith(eventB);
      expect(
        warnSpy.mock.calls.some((call: unknown[]) => String(call[0]).includes("manual-update")),
      ).toBe(true);
    });
  });

  it("keeps nested group tree consistent across v-if and v-for changes", async () => {
    registerGraphicExtension();

    const option = ref({ series: [{ type: "line", data: [1, 2, 3] }] });
    const leftItems = ref(["a", "b"]);
    const rightItems = ref(["c"]);
    const showRight = ref(true);

    const Root = defineComponent({
      setup() {
        return () =>
          h(
            ECharts,
            { option: option.value },
            {
              graphic: () => [
                h(
                  GGroup,
                  { id: "left", key: "left" },
                  {
                    default: () =>
                      leftItems.value.map((id, index) =>
                        h(GRect, { id, key: id, x: index * 10, y: 0, width: 8, height: 8 }),
                      ),
                  },
                ),
                showRight.value
                  ? h(
                      GGroup,
                      { id: "right", key: "right" },
                      {
                        default: () =>
                          rightItems.value.map((id, index) =>
                            h(GRect, {
                              id,
                              key: id,
                              x: 20 + index * 10,
                              y: 0,
                              width: 8,
                              height: 8,
                            }),
                          ),
                      },
                    )
                  : null,
              ],
            },
          );
      },
    });

    render(Root);
    await nextTick();
    await flushAnimationFrame();

    let children = getLastGraphicRootChildren();
    let left = children.find((item) => item.id === "left") as any;
    let right = children.find((item) => item.id === "right") as any;
    expect(children.map((item) => item.id)).toEqual(["left", "right"]);
    expect(left.children.map((item: any) => item.id)).toEqual(["a", "b"]);
    expect(right.children.map((item: any) => item.id)).toEqual(["c"]);

    leftItems.value = ["b", "a"];
    showRight.value = false;
    await nextTick();
    await flushAnimationFrame();

    children = getLastGraphicRootChildren();
    left = children.find((item) => item.id === "left") as any;
    expect(children.map((item) => item.id)).toEqual(["left"]);
    expect(left.children.map((item: any) => item.id)).toEqual(["b", "a"]);

    rightItems.value = ["d", "c"];
    showRight.value = true;
    await nextTick();
    await flushAnimationFrame();

    children = getLastGraphicRootChildren();
    right = children.find((item) => item.id === "right") as any;
    expect(children.map((item) => item.id)).toEqual(["left", "right"]);
    expect(right.children.map((item: any) => item.id)).toEqual(["d", "c"]);
  });
});
