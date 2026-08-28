import { computed, defineComponent, h, nextTick, ref, shallowRef } from "vue";
import type { VNodeRef } from "vue";
import { describe, expect, it } from "vitest";
import { use, registerTheme } from "echarts/core";
import { GraphChart } from "echarts/charts";
import { LegendComponent, TooltipComponent } from "echarts/components";
import { SVGRenderer } from "echarts/renderers";
import type { ComponentExposed } from "vue-component-type-helpers";
import ECharts from "../src/ECharts";
import type { EChartsType, Option, Theme } from "../src/types";
import { render } from "./helpers/testing";
import { flushAnimationFrame } from "./helpers/dom";

use([SVGRenderer, GraphChart, LegendComponent, TooltipComponent]);
registerTheme("dark", { backgroundColor: "#111827" });

type Exposed = ComponentExposed<typeof ECharts>;

enum Category {
  ROOT = "Root",
  LEAF = "Leaf",
}

function createExposeSetter(exposed: { value?: Exposed }): VNodeRef {
  return (value) => {
    exposed.value = value ? (value as Exposed) : undefined;
  };
}

function getChart(exposed: Exposed | undefined): EChartsType {
  if (!exposed) {
    throw new Error("Expected exposed instance to be defined.");
  }
  const raw = (exposed as { chart?: unknown }).chart;
  const chart = typeof raw === "object" && raw && "value" in raw ? (raw as any).value : raw;
  if (!chart) {
    throw new Error("Expected chart instance to be defined.");
  }
  return chart as EChartsType;
}

function getSeriesDataLength(chart: EChartsType): number {
  const option = chart.getOption() as {
    series?: Array<{ data?: unknown[] }>;
  };
  return option.series?.[0]?.data?.length ?? 0;
}

function getSeriesCount(chart: EChartsType): number {
  return (chart.getOption() as { series?: unknown[] }).series?.length ?? 0;
}

async function flushFrames(count = 3): Promise<void> {
  for (let i = 0; i < count; i++) {
    await flushAnimationFrame();
  }
}

function buildGraphData() {
  return [
    { id: "root", category: Category.ROOT, x: 0, y: 0, symbolSize: 80 },
    { id: "leaf-a", category: Category.LEAF, x: 100, y: 0, symbolSize: 36 },
    { id: "leaf-b", category: Category.LEAF, x: -100, y: 0, symbolSize: 36 },
  ];
}

function buildGraphLinks() {
  return [
    { source: "root", target: "leaf-a" },
    { source: "root", target: "leaf-b" },
  ];
}

describe("ECharts theme behavior (real echarts)", () => {
  it("applies a theme change made before the first option", async () => {
    const option = ref<Option>();
    const theme = ref<Theme>("dark");
    const exposed = shallowRef<Exposed>();
    const Root = defineComponent({
      setup() {
        return () =>
          h(ECharts, {
            option: option.value,
            theme: theme.value,
            style: "width: 640px; height: 420px;",
            ref: createExposeSetter(exposed),
          });
      },
    });

    render(Root);
    await nextTick();

    const chart = getChart(exposed.value);
    expect(chart.getOption()).toBeUndefined();

    theme.value = "";
    await nextTick();
    option.value = { series: [] };
    await nextTick();
    await flushFrames();

    expect(chart.getOption().backgroundColor).not.toBe("#111827");
  });

  it("preserves the latest automatic option while its source is temporarily absent", async () => {
    const theme = ref<Theme>("dark");
    const option = ref<Option | undefined>({
      series: [
        { id: "keep", type: "graph", data: [{ id: "initial" }] },
        { id: "remove", type: "graph", data: [] },
      ],
    });
    const exposed = shallowRef<Exposed>();
    const Root = defineComponent({
      setup() {
        return () =>
          h(ECharts, {
            option: option.value,
            theme: theme.value,
            style: "width: 640px; height: 420px;",
            ref: createExposeSetter(exposed),
          });
      },
    });

    render(Root);
    await nextTick();

    option.value = {
      series: [{ id: "keep", type: "graph", data: buildGraphData() }],
    };
    await nextTick();

    const chart = getChart(exposed.value);
    expect(getSeriesDataLength(chart)).toBe(3);
    expect(getSeriesCount(chart)).toBe(1);

    option.value = undefined;
    await nextTick();
    theme.value = "";
    await nextTick();

    expect(getSeriesDataLength(chart)).toBe(3);
    expect(getSeriesCount(chart)).toBe(1);
  });

  it("resets an empty theme without losing existing graph data", async () => {
    const isDark = ref(true);
    const theme = computed(() => (isDark.value ? "dark" : ""));
    const option = ref<Option>({
      series: {
        type: "graph",
        layout: "none",
        data: buildGraphData(),
        links: buildGraphLinks(),
      } as Option["series"],
    });

    const exposed = shallowRef<Exposed>();
    const Root = defineComponent({
      setup() {
        return () =>
          h(ECharts, {
            option: option.value,
            theme: theme.value,
            style: "width: 640px; height: 420px;",
            ref: createExposeSetter(exposed),
          });
      },
    });

    render(Root);
    await nextTick();
    await flushFrames();

    const chart = getChart(exposed.value);
    expect(getSeriesDataLength(chart)).toBe(3);
    expect(chart.getOption().backgroundColor).toBe("#111827");

    isDark.value = false;
    await nextTick();
    await flushFrames();

    expect(getSeriesDataLength(chart)).toBe(3);
    expect(chart.getOption().backgroundColor).not.toBe("#111827");
  });
});

describe("ECharts callback slots (real echarts)", () => {
  it("keeps a callback through theme changes and preserves legend state after removal", async () => {
    const showTooltipSlot = ref(true);
    const theme = ref<Theme | undefined>("dark");
    const option: Option = {
      legend: { data: ["A", "B"] },
      series: [
        { id: "a", name: "A", type: "graph", data: [] },
        { id: "b", name: "B", type: "graph", data: [] },
      ],
    };
    const exposed = shallowRef<Exposed>();

    const Root = defineComponent({
      setup() {
        return () =>
          h(
            ECharts,
            {
              option,
              theme: theme.value,
              style: "width: 640px; height: 420px;",
              ref: createExposeSetter(exposed),
            },
            showTooltipSlot.value
              ? { "tooltip-series-0": () => [h("span", "custom-tooltip")] }
              : undefined,
          );
      },
    });

    render(Root);
    await nextTick();

    const chart = getChart(exposed.value);
    const getFormatter = () =>
      (chart.getOption() as { series?: Array<{ tooltip?: { formatter?: unknown } }> }).series?.[0]
        ?.tooltip?.formatter;

    expect(getFormatter()).toBeTypeOf("function");

    theme.value = undefined;
    await nextTick();

    expect(getFormatter()).toBeTypeOf("function");
    chart.dispatchAction({ type: "legendUnSelect", name: "B" });
    const getLegendSelection = () =>
      (chart.getOption() as { legend?: Array<{ selected?: Record<string, boolean> }> }).legend?.[0]
        ?.selected?.B;
    expect(getLegendSelection()).toBe(false);

    showTooltipSlot.value = false;
    await nextTick();
    await nextTick();

    expect(getFormatter()).not.toBeTypeOf("function");
    expect(getLegendSelection()).toBe(false);
  });
});
