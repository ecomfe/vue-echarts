import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";

import { render } from "./helpers/testing";
import { flushAnimationFrame } from "./helpers/dom";
import { createEChartsModule } from "./helpers/mock";
import ECharts from "../src/ECharts";
import { registerExtension } from "../src/graphic/extension";
import { GGroup, GRect } from "../src/graphic/components";
import {
  getLastGraphicIds,
  getLastGraphicChanges,
  setupGraphicSlotSuite,
} from "./helpers/graphic-slot";

vi.mock("echarts/core", () => createEChartsModule());

const suite = setupGraphicSlotSuite();

describe("graphic slot order and tree behavior", () => {
  it("preserves expected order when a middle node is toggled by v-if", async () => {
    registerExtension();

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
    expect(getLastGraphicIds(suite.getChartStub())).toEqual(["a", "c"]);

    showB.value = true;
    await nextTick();
    await flushAnimationFrame();
    expect(getLastGraphicIds(suite.getChartStub())).toEqual(["a", "b", "c"]);

    showB.value = false;
    await nextTick();
    await flushAnimationFrame();
    expect(getLastGraphicIds(suite.getChartStub())).toEqual(["a", "c"]);
  });

  it("tracks v-for reorder and removal with stable ids", async () => {
    registerExtension();

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
    expect(getLastGraphicIds(suite.getChartStub())).toEqual(["a", "b", "c"]);

    items.value = ["c", "a", "b"];
    await nextTick();
    await flushAnimationFrame();
    expect(getLastGraphicIds(suite.getChartStub())).toEqual(["c", "a", "b"]);

    items.value = ["c", "b"];
    await nextTick();
    await flushAnimationFrame();
    expect(getLastGraphicIds(suite.getChartStub())).toEqual(["c", "b"]);
  });

  it("tracks keyed wrapper component reordering", async () => {
    registerExtension();

    const items = ref(["a", "b", "c"]);
    const Item = defineComponent({
      props: { nodeKey: { type: String, required: true } },
      setup(props) {
        return () => h(GRect, { key: props.nodeKey, x: 0, y: 0, width: 8, height: 8 });
      },
    });
    const Root = defineComponent({
      setup() {
        return () =>
          h(
            ECharts,
            { option: {} },
            { graphic: () => items.value.map((id) => h(Item, { nodeKey: id, key: id })) },
          );
      },
    });

    render(Root);
    await nextTick();
    await flushAnimationFrame();
    expect(getLastGraphicIds(suite.getChartStub())).toEqual(["a", "b", "c"]);

    items.value = ["c", "a", "b"];
    await nextTick();
    await flushAnimationFrame();
    expect(getLastGraphicIds(suite.getChartStub())).toEqual(["c", "a", "b"]);
  });

  it("moves nodes across groups when conditional parent changes", async () => {
    registerExtension();

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

    let children = getLastGraphicChanges(suite.getChartStub());
    let left = children.find((item) => item.id === "left") as any;
    let right = children.find((item) => item.id === "right") as any;
    expect(left.children?.map((node: any) => node.id)).toEqual(["moving"]);
    expect(right.children ?? []).toEqual([]);

    inLeft.value = false;
    await nextTick();
    await flushAnimationFrame();

    children = getLastGraphicChanges(suite.getChartStub());
    left = children.find((item) => item.id === "left") as any;
    right = children.find((item) => item.id === "right") as any;
    expect(left.children ?? []).toEqual([]);
    expect(right.children?.map((node: any) => node.id)).toEqual(["moving"]);
  });

  it("preserves order for key-only nodes when v-for is reordered", async () => {
    registerExtension();

    const option = ref({ series: [{ type: "line", data: [1, 2, 3] }] });
    const items = ref<Array<string | number>>(["1", 1, 0, "x"]);

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
    const ids = getLastGraphicIds(suite.getChartStub());
    expect(ids).toHaveLength(4);
    expect(new Set(ids).size).toBe(4);

    items.value = [0, 1, "x", "1"];
    await nextTick();
    await flushAnimationFrame();
    expect(getLastGraphicIds(suite.getChartStub())).toEqual([ids[2], ids[1], ids[3], ids[0]]);
  });

  it("supports reorder with id-only nodes (without :key)", async () => {
    registerExtension();

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
    expect(getLastGraphicIds(suite.getChartStub())).toEqual(["a", "b", "c"]);

    ids.value = ["c", "a", "b"];
    await nextTick();
    await flushAnimationFrame();
    expect(getLastGraphicIds(suite.getChartStub())).toEqual(["c", "a", "b"]);
  });
});
