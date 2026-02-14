import { computed, defineComponent, h, nextTick, ref, shallowRef } from "vue";
import type { VNodeRef } from "vue";
import { describe, expect, it } from "vitest";
import { use, registerTheme } from "echarts/core";
import { GraphChart } from "echarts/charts";
import { TooltipComponent } from "echarts/components";
import { SVGRenderer } from "echarts/renderers";
import type { ComponentExposed } from "vue-component-type-helpers";
import ECharts from "../src/ECharts";
import type { EChartsType, Option } from "../src/types";
import { render } from "./helpers/testing";
import { flushAnimationFrame } from "./helpers/dom";

use([SVGRenderer, GraphChart, TooltipComponent]);
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
  it("keeps delayed graph data after theme toggles", async () => {
    const isDark = ref(true);
    const theme = computed(() => (isDark.value ? "dark" : undefined));
    const option = ref<Option>({
      series: {
        type: "graph",
        layout: "none",
        roam: true,
        categories: [{ name: Category.ROOT }, { name: Category.LEAF }],
      } as Option["series"],
      tooltip: { trigger: "item" },
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

    const series = option.value.series as Record<string, unknown>;
    series.data = buildGraphData();
    series.links = buildGraphLinks();
    await nextTick();
    await flushFrames();

    const chart = getChart(exposed.value);
    expect(getSeriesDataLength(chart)).toBe(3);

    isDark.value = false;
    await nextTick();
    await flushFrames();

    expect(getSeriesDataLength(chart)).toBe(3);
  });

  it("keeps graph data after theme toggles when data exists initially", async () => {
    const isDark = ref(true);
    const theme = computed(() => (isDark.value ? "dark" : undefined));
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

    isDark.value = false;
    await nextTick();
    await flushFrames();

    expect(getSeriesDataLength(chart)).toBe(3);
  });
});
