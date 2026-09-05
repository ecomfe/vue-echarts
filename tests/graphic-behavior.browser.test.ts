import { describe, it, expect } from "vitest";
import { defineComponent, h, nextTick, ref, shallowRef } from "vue";
import type { VNodeRef } from "vue";
import { use } from "echarts/core";
import { GraphicComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsType, Option, Theme } from "../src/types";
import ECharts from "../src/ECharts";
import { registerExtension } from "../src/graphic/extension";
import { GGroup, GRect } from "../src/graphic/components";
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

function getGraphicTree(chart: EChartsType): Array<Record<string, any>> {
  const graphics = chart.getOption().graphic as Array<{ elements: Array<Record<string, any>> }>;
  const elements = graphics[0].elements;
  const nodes = new Map(elements.map((element) => [element.id, { ...element }]));
  for (const node of nodes.values()) {
    const parent = nodes.get(node.parentId);
    if (parent) (parent.children ??= []).push(node);
  }
  return nodes.get(elements[0].id)?.children ?? [];
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
  it("removes omitted nested elements during smart updates", async () => {
    const option = ref({
      graphic: {
        elements: [
          {
            type: "group",
            id: "group",
            children: [rect("a", 0, 0), rect("b", 40, 0)],
          },
        ],
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
        elements: [
          {
            type: "group",
            id: "group",
            children: [rect("b", 40, 0)],
          },
        ],
      },
    };

    await nextTick();
    await flushAnimationFrame();

    ids = collectGraphicIds(chart);
    expect(ids.has("a")).toBe(false);
    expect(ids.has("b")).toBe(true);
  });

  it("removes elements when $action: 'remove' is provided", async () => {
    const option = ref<Option>({
      backgroundColor: "#ef4444",
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
    expect(chart.getOption().backgroundColor).toBe("#ef4444");
  });

  it.each([false, true])(
    "clears a removed option while keeping the graphic slot (theme update: %s)",
    async (updateTheme) => {
      registerExtension();

      const option = ref<Option | undefined>({ backgroundColor: "#ef4444" });
      const theme = ref<Theme>();
      const exposed = shallowRef<Exposed>();
      const Root = defineComponent({
        setup() {
          return () =>
            h(
              ECharts,
              {
                option: option.value,
                theme: theme.value,
                style: "width: 200px; height: 120px;",
                ref: createExposeSetter(exposed),
              },
              {
                graphic: () => h(GRect, { id: "graphic-only", width: 20, height: 10 }),
              },
            );
        },
      });

      render(Root);
      await nextTick();
      await flushAnimationFrame();

      const chart = getChart(exposed.value);
      expect(chart.getOption().backgroundColor).toBe("#ef4444");

      option.value = undefined;
      if (updateTheme) {
        theme.value = { color: ["#22c55e"] };
      }
      await nextTick();
      await flushAnimationFrame();

      expect(chart.getOption().backgroundColor).not.toBe("#ef4444");
      expect(collectGraphicIds(chart).has("graphic-only")).toBe(true);
    },
  );

  it("reparents slotted graphic nodes safely", async () => {
    registerExtension();

    const option = ref({ series: [{ type: "line", data: [1, 2, 3] }] });
    const grouped = ref(true);

    const exposed = shallowRef<Exposed>();
    const Root = defineComponent({
      setup() {
        return () =>
          h(
            ECharts,
            {
              option: option.value,
              style: "width: 220px; height: 140px;",
              ref: createExposeSetter(exposed),
            },
            {
              graphic: () =>
                grouped.value
                  ? h(GGroup, { id: "g" }, () =>
                      h(GRect, { id: "moving", x: 12, y: 10, width: 18, height: 10 }),
                    )
                  : h(GRect, { id: "moving", x: 42, y: 10, width: 18, height: 10 }),
            },
          );
      },
    });

    render(Root);
    await nextTick();
    await flushAnimationFrame();

    const chart = getChart(exposed.value);
    let ids = collectGraphicIds(chart);
    expect(ids.has("moving")).toBe(true);

    grouped.value = false;
    await nextTick();
    await flushAnimationFrame();

    ids = collectGraphicIds(chart);
    expect(ids.has("moving")).toBe(true);
  });
  it("keeps nested group tree consistent across v-if and v-for changes", async () => {
    registerExtension();
    const exposed = shallowRef<Exposed>();

    const option = ref({ series: [{ type: "line", data: [1, 2, 3] }] });
    const leftItems = ref(["a", "b"]);
    const rightItems = ref(["c"]);
    const showRight = ref(true);

    const Root = defineComponent({
      setup() {
        return () =>
          h(
            ECharts,
            {
              option: option.value,
              initOptions: { width: 220, height: 140 },
              ref: createExposeSetter(exposed),
            },
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

    let children = getGraphicTree(getChart(exposed.value));
    let left = children.find((item) => item.id === "left") as any;
    let right = children.find((item) => item.id === "right") as any;
    expect(children.map((item) => item.id)).toEqual(["left", "right"]);
    expect(left.children.map((item: any) => item.id)).toEqual(["a", "b"]);
    expect(right.children.map((item: any) => item.id)).toEqual(["c"]);

    leftItems.value = ["b", "a"];
    showRight.value = false;
    await nextTick();
    await flushAnimationFrame();

    children = getGraphicTree(getChart(exposed.value));
    left = children.find((item) => item.id === "left") as any;
    expect(children.map((item) => item.id)).toEqual(["left"]);
    expect(left.children.map((item: any) => item.id)).toEqual(["b", "a"]);

    rightItems.value = ["d", "c"];
    showRight.value = true;
    await nextTick();
    await flushAnimationFrame();

    children = getGraphicTree(getChart(exposed.value));
    right = children.find((item) => item.id === "right") as any;
    expect(children.map((item) => item.id)).toEqual(["left", "right"]);
    expect(right.children.map((item: any) => item.id)).toEqual(["d", "c"]);
  });
});
