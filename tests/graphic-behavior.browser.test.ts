import { describe, it, expect } from "vitest";
import { defineComponent, h, nextTick, ref, shallowRef } from "vue";
import type { VNodeRef } from "vue";
import { use } from "echarts/core";
import { GraphicComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsType } from "../src/types";
import ECharts from "../src/ECharts";
import { render } from "./helpers/testing";
import { flushAnimationFrame } from "./helpers/dom";
import type { ComponentExposed } from "vue-component-type-helpers";

use([GraphicComponent, CanvasRenderer]);

type Exposed = ComponentExposed<typeof ECharts>;

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

function collectGraphicIds(chart: EChartsType): Set<string> {
  const displayList = chart.getZr().storage.getDisplayList() as any[];
  const ids = new Set<string>();

  for (const el of displayList) {
    const candidates = [
      el.__ecGraphicId,
      el.id,
      el.name,
      el.__ecGraphicId != null ? String(el.__ecGraphicId) : undefined,
      el.id != null ? String(el.id) : undefined,
      el.name != null ? String(el.name) : undefined,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === "string") {
        ids.add(candidate);
      }
    }
  }

  return ids;
}

function createExposeSetter(exposed: { value?: Exposed }): VNodeRef {
  return (value) => {
    exposed.value = value ? (value as Exposed) : undefined;
  };
}

function rect(id: string, x: number, y: number, width = 20, height = 10) {
  return {
    type: "rect",
    id,
    shape: { x, y, width, height },
    style: { fill: "#5470c6" },
  };
}

describe("graphic update behavior (real echarts)", () => {
  it("keeps omitted elements when using default merge", async () => {
    const option = ref({
      graphic: {
        elements: [rect("a", 0, 0), rect("b", 40, 0)],
      },
    });

    const exposed = shallowRef<Exposed>();
    const Root = defineComponent({
      setup() {
        return () =>
          h(ECharts, {
            option: option.value,
            style: "width: 200px; height: 120px;",
            ref: createExposeSetter(exposed),
          });
      },
    });

    render(Root);
    await nextTick();
    await flushAnimationFrame();

    const chart = getChart(exposed.value);
    let ids = collectGraphicIds(chart);
    expect(ids.has("a")).toBe(true);
    expect(ids.has("b")).toBe(true);

    option.value = {
      graphic: {
        elements: [rect("b", 40, 0)],
      },
    };

    await nextTick();
    await flushAnimationFrame();

    ids = collectGraphicIds(chart);
    // Expect the omitted "a" to remain because merge does not delete by default.
    expect(ids.has("a")).toBe(true);
    expect(ids.has("b")).toBe(true);
  });

  it("removes elements when $action: 'remove' is provided", async () => {
    const option = ref({
      graphic: {
        elements: [rect("a", 0, 0), rect("b", 40, 0)],
      },
    });

    const exposed = shallowRef<Exposed>();
    const Root = defineComponent({
      setup() {
        return () =>
          h(ECharts, {
            option: option.value,
            style: "width: 200px; height: 120px;",
            ref: createExposeSetter(exposed),
          });
      },
    });

    render(Root);
    await nextTick();
    await flushAnimationFrame();

    const chart = getChart(exposed.value);
    let ids = collectGraphicIds(chart);
    expect(ids.has("a")).toBe(true);
    expect(ids.has("b")).toBe(true);

    option.value = {
      graphic: {
        elements: [{ id: "a", $action: "remove" } as any, rect("b", 40, 0)],
      },
    };

    await nextTick();
    await flushAnimationFrame();

    ids = collectGraphicIds(chart);
    expect(ids.has("a")).toBe(false);
    expect(ids.has("b")).toBe(true);
  });
});
