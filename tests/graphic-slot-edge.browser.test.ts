import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";
import { render } from "./helpers/testing";
import { flushAnimationFrame, withConsoleWarn, withConsoleWarnAsync } from "./helpers/dom";
import { createEChartsModule } from "./helpers/mock";
import ECharts from "../src/ECharts";
import { registerGraphicExtension } from "../src/graphic/extension";
import { GRect } from "../src/graphic/components";
import {
  getLastGraphicIds,
  getLastGraphicOption,
  setupGraphicSlotSuite,
} from "./helpers/graphic-slot";

vi.mock("echarts/core", () => createEChartsModule());

const suite = setupGraphicSlotSuite();

describe("graphic slot edge and integration behavior", () => {
  it("warns when graphic slot is used without the graphic entry", async () => {
    const option = ref({
      graphic: { elements: [{ type: "rect", id: "from-option", shape: { x: 0, y: 0 } }] },
    });

    const Root = defineComponent({
      setup() {
        return () => h(ECharts, { option: option.value }, { graphic: () => h("div") });
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
    const chartStub = suite.getChartStub();
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

      const lastCall = suite.getChartStub().setOption.mock.calls.at(-1)?.[0] as any;
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
    const x = ref(10);

    const Root = defineComponent({
      setup() {
        return () =>
          h(
            ECharts,
            { option: option.value, theme: theme.value },
            {
              graphic: () =>
                h(GRect, { id: "slot-rect", x: x.value, y: 10, width: 20, height: 12 }),
            },
          );
      },
    });

    render(Root);
    await nextTick();
    await flushAnimationFrame();

    const chartStub = suite.getChartStub();
    chartStub.setOption.mockClear();

    x.value = 32;
    theme.value = { backgroundColor: "#111827" };
    await nextTick();
    await flushAnimationFrame();

    expect(chartStub.setTheme).toHaveBeenCalledWith({ backgroundColor: "#111827" });
    expect(chartStub.setOption).toHaveBeenCalled();
    const [optionArg, updateArg] = chartStub.setOption.mock.calls.at(-1) as [any, any];
    expect(optionArg.graphic.elements[0].children[0].shape).toMatchObject({ x: 32 });
    expect(updateArg?.replaceMerge).toContain("graphic");
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
    expect(getLastGraphicIds(suite.getChartStub())).toEqual(["slot-rect"]);

    showGraphic.value = false;
    await nextTick();
    await flushAnimationFrame();

    const [optionArg, updateArg] = suite.getChartStub().setOption.mock.calls.at(-1) as [any, any];
    expect(optionArg.graphic).toBeUndefined();
    expect(updateArg?.replaceMerge).toContain("graphic");

    showGraphic.value = true;
    await nextTick();
    await flushAnimationFrame();
    expect(getLastGraphicIds(suite.getChartStub())).toEqual(["slot-rect"]);
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
    expect(getLastGraphicIds(suite.getChartStub())).toEqual(["wrapped"]);
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
      expect(getLastGraphicIds(suite.getChartStub())[0]).toMatch(/^__ve_graphic_/);
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
    expect(getLastGraphicIds(suite.getChartStub())).toEqual([]);
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

    const graphic = getLastGraphicOption(suite.getChartStub()).graphic.elements[0]
      .children as any[];
    const marker = graphic.find((item) => item.id === "marker");
    const markerBg = graphic.find((item) => item.id === "marker-bg");
    expect(marker.shape).toMatchObject({ x: 36 });
    expect(marker.style).toMatchObject({ fill: "#22c55e" });
    expect(markerBg.shape).toMatchObject({ x: 34 });
  });

  it("keeps graphic replaceMerge when option and graphic update together", async () => {
    registerGraphicExtension();

    const option = ref({ series: [{ type: "line", data: [1, 2, 3] }] });
    const x = ref(10);

    const Root = defineComponent({
      setup() {
        return () =>
          h(
            ECharts,
            { option: option.value },
            {
              graphic: () => h(GRect, { id: "marker", x: x.value, y: 10, width: 20, height: 12 }),
            },
          );
      },
    });

    render(Root);
    await nextTick();
    await flushAnimationFrame();

    option.value = { series: [{ type: "line", data: [3, 2, 1] }] };
    x.value = 36;
    await nextTick();
    await flushAnimationFrame();

    const chartStub = suite.getChartStub();
    const [, updateArg] = chartStub.setOption.mock.calls.at(-1) as [any, any];
    expect(updateArg?.replaceMerge).toContain("graphic");
    const marker = getLastGraphicOption(chartStub).graphic.elements[0].children[0];
    expect(marker.shape).toMatchObject({ x: 36 });
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
    const chartStub = suite.getChartStub();
    const before = chartStub.setOption.mock.calls.length;

    x.value = 20;
    y.value = 28;
    await nextTick();
    await flushAnimationFrame();

    expect(chartStub.setOption.mock.calls.length).toBe(before + 1);
    const shape = getLastGraphicOption(chartStub).graphic.elements[0].children[0].shape;
    expect(shape).toMatchObject({ x: 20, y: 28 });
  });

  it("rerenders 100+ nodes safely when parent rerenders", async () => {
    registerGraphicExtension();

    const option = ref({ series: [{ type: "line", data: [1, 2, 3] }] });
    const rerenderTick = ref(0);
    const items = Array.from({ length: 120 }, (_, i) => i);

    const Root = defineComponent({
      setup() {
        return () =>
          h(
            ECharts,
            { option: option.value, class: `tick-${rerenderTick.value}` },
            {
              graphic: () =>
                items.map((i) =>
                  h(GRect, {
                    id: `node-${i}`,
                    x: i * 2,
                    y: i % 10,
                    width: 2,
                    height: 2,
                  }),
                ),
            },
          );
      },
    });

    render(Root);
    await nextTick();
    await flushAnimationFrame();

    const chartStub = suite.getChartStub();
    const baseCalls = chartStub.setOption.mock.calls.length;
    rerenderTick.value += 1;
    await nextTick();
    await flushAnimationFrame();

    expect(chartStub.setOption.mock.calls.length).toBe(baseCalls + 1);
  });
});
