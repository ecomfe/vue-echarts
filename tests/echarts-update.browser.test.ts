import {
  defineComponent,
  Fragment,
  h,
  inject,
  nextTick,
  onErrorCaptured,
  provide,
  ref,
  shallowRef,
} from "vue";
import type { Component, VNodeChild } from "vue";
import type { ECElementEvent } from "echarts/core";
import { describe, expect, it, vi } from "vitest";
import { use } from "echarts/core";
import { PieChart } from "echarts/charts";
import { LegendComponent, TitleComponent, TooltipComponent } from "echarts/components";
import { SVGRenderer } from "echarts/renderers";
import type { ComponentExposed } from "vue-component-type-helpers";
import ECharts from "../src/ECharts";
import { registerExtension } from "../src/graphic/extension";
import { GRect } from "../src/graphic/components";
import * as graphicComponents from "../src/graphic/components";
import type { Option, UpdateOptions } from "../src/types";
import { flushAnimationFrame } from "./helpers/dom";
import { render } from "./helpers/testing";

use([SVGRenderer, PieChart, LegendComponent, TitleComponent, TooltipComponent]);

function mountChart(
  props: () => Record<string, unknown>,
  errors?: unknown[],
  slots?: Record<string, () => VNodeChild> | (() => Record<string, () => VNodeChild>),
) {
  const exposed = shallowRef<ComponentExposed<typeof ECharts>>();
  const initOptions = { renderer: "svg", width: 400, height: 300 } as const;
  render(
    defineComponent({
      setup() {
        if (errors) {
          onErrorCaptured((error) => {
            errors.push(error);
            return false;
          });
        }
        return () =>
          h(
            ECharts,
            { ...props(), initOptions, ref: exposed },
            typeof slots === "function" ? slots() : slots,
          );
      },
    }),
  );
  return exposed.value!;
}

function pieOption(value: number, animation = false): Option {
  return {
    animation,
    animationDurationUpdate: 10000,
    legend: { data: ["A", "B"] },
    series: [
      {
        id: "a",
        name: "A",
        type: "pie",
        data: [
          { id: "first", name: "first", value },
          { id: "second", name: "second", value: 2 },
        ],
      },
      { id: "b", name: "B", type: "pie", data: [5] },
    ],
  };
}

describe("reactive update contracts", () => {
  it("preserves interaction and graphic elements while animating new data", async () => {
    const option = ref(pieOption(1));
    const chart = mountChart(() => ({ option: option.value }));
    await nextTick();
    chart.dispatchAction({ type: "legendUnSelect", name: "B" });
    const sector = chart
      .getZr()
      .storage.getDisplayList()
      .find((el) => el.type === "sector")!;

    option.value = pieOption(3, true);
    await nextTick();

    const applied = chart.getOption() as { legend: Array<{ selected: Record<string, boolean> }> };
    expect(applied.legend[0].selected.B).toBe(false);
    expect(chart.getZr().storage.getDisplayList()).toContain(sector);
    expect(sector.animators.some((animator) => animator.targetName === "shape")).toBe(true);
  });

  it("reapplies controlled interaction state after a theme recreates the native model", async () => {
    const option = ref(pieOption(1));
    const theme = ref({ backgroundColor: "white" });
    const chart = mountChart(() => ({ option: option.value, theme: theme.value }));
    await nextTick();
    chart.dispatchAction({ type: "legendUnSelect", name: "B" });
    // Keep state that must survive rebuilds in the full option snapshot.
    option.value = { ...pieOption(2), legend: { data: ["A", "B"], selected: { B: false } } };
    theme.value = { backgroundColor: "black" };
    await nextTick();
    expect(chart.getOption().legend).toMatchObject([{ selected: { B: false } }]);
    expect(chart.getOption().series).toMatchObject([{ data: [{ value: 2 }, {}] }, {}]);
  });

  it("recovers configuration deletion after a failed option submission", async () => {
    const option = ref<Option>({ title: { id: "title", text: "before", subtext: "stale" } });
    const errors: unknown[] = [];
    const chart = mountChart(() => ({ option: option.value }), errors);
    const failure = new Error("setOption failed");
    vi.spyOn(chart.chart!, "setOption").mockImplementationOnce(() => {
      throw failure;
    });

    option.value = { title: { id: "title", text: "failed" } };
    await nextTick();
    expect(errors).toEqual([failure]);

    option.value = { title: { id: "title", text: "retry" } };
    await nextTick();
    expect(chart.getOption().title).toMatchObject([{ text: "retry", subtext: "" }]);
  });

  it("keeps a completed clear when an update event interrupts theme replay", async () => {
    const option = ref(pieOption(1));
    const theme = ref({ backgroundColor: "white" });
    const chart = mountChart(() => ({ option: option.value, theme: theme.value }));
    let cleared = false;
    chart.chart!.on("updated", () => {
      if (!cleared && chart.getOption().backgroundColor === "black") {
        cleared = true;
        chart.clear();
      }
    });

    option.value = pieOption(3);
    theme.value = { backgroundColor: "black" };
    await nextTick();

    expect(cleared).toBe(true);
    expect(chart.getOption().series).toEqual([]);

    option.value = pieOption(4);
    await nextTick();
    expect(chart.getOption().series).toMatchObject([{ data: [{ value: 4 }, { value: 2 }] }, {}]);
  });

  it("retries a failed theme on the next option update", async () => {
    const option = ref(pieOption(1));
    const theme = ref({ backgroundColor: "white" });
    const errors: unknown[] = [];
    const chart = mountChart(() => ({ option: option.value, theme: theme.value }), errors);
    const failure = new Error("setTheme failed");
    vi.spyOn(chart.chart!, "setTheme").mockImplementationOnce(() => {
      throw failure;
    });

    theme.value = { backgroundColor: "black" };
    await nextTick();
    expect(errors).toEqual([failure]);

    option.value = pieOption(3);
    await nextTick();
    expect(chart.getOption().backgroundColor).toBe("black");
    expect(chart.getOption().series).toMatchObject([{ data: [{ value: 3 }, { value: 2 }] }, {}]);
  });

  it.each(["clear", "failure"] as const)(
    "establishes the source baseline again for graphic updates after %s",
    async (interruption) => {
      registerExtension();
      const option = ref<Option>({ title: { id: "title", text: "before", subtext: "stale" } });
      const x = ref(0);
      const errors: unknown[] = [];
      const chart = mountChart(() => ({ option: option.value }), errors, {
        graphic: () => [h(GRect, { id: "marker", x: x.value, width: 10, height: 10 })],
      });
      await nextTick();

      if (interruption === "clear") {
        chart.clear();
        x.value++;
        await nextTick();
        option.value = { title: { id: "title", text: "after" } };
      } else {
        const failure = new Error("setOption failed");
        vi.spyOn(chart.chart!, "setOption").mockImplementationOnce(() => {
          throw failure;
        });
        option.value = { title: { id: "title", text: "after" } };
        await nextTick();
        expect(errors).toEqual([failure]);
        x.value++;
      }

      await nextTick();
      expect(chart.getOption().title).toMatchObject([{ text: "after", subtext: "" }]);
    },
  );
});

describe("update ownership and scheduling", () => {
  it("coalesces source, theme and graphic changes into theme then latest option", async () => {
    registerExtension();
    const option = ref(pieOption(1));
    const theme = ref({ backgroundColor: "white" });
    const x = ref(0);
    const chart = mountChart(() => ({ option: option.value, theme: theme.value }), undefined, {
      graphic: () => [h(GRect, { id: "marker", x: x.value, width: 10, height: 10 })],
    });
    await nextTick();
    const calls: string[] = [];
    const nativeTheme = chart.chart!.setTheme.bind(chart.chart);
    vi.spyOn(chart.chart!, "setTheme").mockImplementation((...args) => {
      calls.push("theme");
      return nativeTheme(...args);
    });
    const nativeOption = chart.chart!.setOption.bind(chart.chart);
    vi.spyOn(chart.chart!, "setOption").mockImplementation((...args) => {
      calls.push("option");
      return nativeOption(...args);
    });
    theme.value = { backgroundColor: "black" };
    option.value = pieOption(3);
    x.value = 20;
    await nextTick();
    await flushAnimationFrame();
    expect(calls).toEqual(["theme", "option"]);
    expect(chart.getOption().series).toMatchObject([{ data: [{ value: 3 }, {}] }, {}]);
    expect(chart.getOption().graphic).toMatchObject([{ elements: [{}, { shape: { x: 20 } }] }]);
  });

  it("keeps graphic and callback work cancelled when clear interrupts a combined update", async () => {
    registerExtension();
    const option = ref(pieOption(1));
    const theme = ref({ backgroundColor: "white" });
    const x = ref(0);
    const tooltip = ref(false);
    const chart = mountChart(
      () => ({ option: option.value, theme: theme.value }),
      undefined,
      () => ({
        ...(tooltip.value ? { tooltip: () => h("span", "tooltip") } : {}),
        graphic: () => [h(GRect, { id: "marker", x: x.value, width: 10, height: 10 })],
      }),
    );
    await nextTick();
    const clear = () => {
      chart.chart!.off("updated", clear);
      chart.clear();
    };
    chart.chart!.on("updated", clear);
    theme.value = { backgroundColor: "black" };
    option.value = pieOption(3);
    x.value = 20;
    tooltip.value = true;
    await nextTick();
    await flushAnimationFrame();
    expect(chart.getOption().series).toEqual([]);
    expect(chart.getZr().storage.getDisplayList()).toEqual([]);
  });

  it("cleans removed callback slots after native theme backup replay", async () => {
    const visible = ref(true);
    const theme = ref({ backgroundColor: "white" });
    const chart = mountChart(
      () => ({ option: { tooltip: {} }, updateOptions: {}, theme: theme.value }),
      undefined,
      () =>
        visible.value
          ? { tooltip: () => h("span", "tooltip") }
          : ({} as Record<string, () => VNodeChild>),
    );
    await nextTick();
    visible.value = false;
    await nextTick();
    expect(chart.getOption().tooltip).toMatchObject([{ formatter: null }]);
    theme.value = { backgroundColor: "black" };
    await nextTick();
    expect(chart.getOption().tooltip).toMatchObject([{ formatter: null }]);
  });

  it.each([false, true])(
    "keeps clear authoritative regardless of prop order (theme first: %s)",
    async (themeFirst) => {
      const option = ref(pieOption(1));
      const theme = ref({ backgroundColor: "white" });
      const chart = mountChart(() =>
        themeFirst
          ? { theme: theme.value, option: option.value }
          : { option: option.value, theme: theme.value },
      );
      await nextTick();
      let cleared = false;
      chart.chart!.on("updated", () => {
        if (!cleared && chart.getOption().backgroundColor === "black") {
          cleared = true;
          chart.clear();
        }
      });
      option.value = pieOption(2);
      theme.value = { backgroundColor: "black" };
      await nextTick();
      expect(cleared).toBe(true);
      expect(chart.getOption().series).toEqual([]);
      option.value = pieOption(3);
      await nextTick();
      expect(chart.getOption().series).toMatchObject([{ data: [{ value: 3 }, {}] }, {}]);
    },
  );

  it("ignores overridden graphic commands when planning configuration deletion", async () => {
    registerExtension();
    const graphic: Option["graphic"] = {
      elements: [{ id: "ignored", type: "rect", $action: "merge" }],
    };
    const option = ref<Option>({
      title: { id: "title", text: "before", subtext: "stale" },
      graphic,
    });
    const warnings = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const chart = mountChart(() => ({ option: option.value }), undefined, {
        graphic: () => [h(GRect, { id: "visible", width: 10, height: 10 })],
      });
      await nextTick();
      option.value = { title: { id: "title", text: "after" }, graphic };
      await nextTick();
      expect(chart.getOption().title).toMatchObject([{ text: "after", subtext: "" }]);
    } finally {
      warnings.mockRestore();
    }
  });

  it("retries callback slot cleanup after a failed explicit merge", async () => {
    const visible = ref(true);
    const option = ref<Option>({ tooltip: {} });
    const exposed = shallowRef<ComponentExposed<typeof ECharts>>();
    const errors: unknown[] = [];
    const initOptions = { renderer: "svg", width: 400, height: 300 } as const;
    render(
      defineComponent({
        setup() {
          onErrorCaptured((error) => {
            errors.push(error);
            return false;
          });
          return () =>
            h(
              ECharts,
              { ref: exposed, option: option.value, updateOptions: {}, initOptions },
              visible.value ? { tooltip: () => h("span", "tooltip") } : {},
            );
        },
      }),
    );
    await nextTick();
    const chart = exposed.value!;
    const failure = new Error("slot cleanup failed");
    vi.spyOn(chart.chart!, "setOption").mockImplementationOnce(() => {
      throw failure;
    });
    visible.value = false;
    await nextTick();
    expect(errors).toEqual([failure]);
    option.value = { tooltip: {}, backgroundColor: "white" };
    await nextTick();
    expect(chart.getOption().tooltip).toMatchObject([{ formatter: null }]);
  });

  it("binds newly added chart and ZRender listeners and root attributes", async () => {
    const attrs = ref<Record<string, unknown>>({});
    const click = vi.fn();
    const zrClick = vi.fn();
    const chart = mountChart(() => ({ option: {}, ...attrs.value }));
    await nextTick();
    attrs.value = { title: "added", onClick: click, "onZr:click": zrClick };
    await nextTick();
    chart.chart!.trigger("click", {} as ECElementEvent);
    chart.getZr().trigger("click", {});
    expect(click).toHaveBeenCalledOnce();
    expect(zrClick).toHaveBeenCalledOnce();
    expect(chart.root?.title).toBe("added");
    attrs.value = {};
    await nextTick();
    chart.chart!.trigger("click", {} as ECElementEvent);
    chart.getZr().trigger("click", {});
    expect(click).toHaveBeenCalledOnce();
    expect(zrClick).toHaveBeenCalledOnce();
    expect(chart.root?.title).toBe("");
  });
});

describe("graphic update continuity", () => {
  it("renders every exported graphic component with the native engine", async () => {
    registerExtension();
    const components: Array<[string, Component]> = Object.entries(graphicComponents);
    const chart = mountChart(() => ({ option: {} }), undefined, {
      graphic: () => components.map(([name, component]) => h(component, { id: name })),
    });
    await nextTick();
    const elements = (
      chart.getOption().graphic as Array<{ elements: Array<{ id: string; type: string }> }>
    )[0].elements;
    expect(elements.slice(1).map(({ id, type }) => [id, type])).toEqual(
      components.map(([name]) => [name, name[1].toLowerCase() + name.slice(2)]),
    );
  });

  it.each<UpdateOptions | undefined>([
    undefined,
    {},
    { lazyUpdate: true, silent: true },
    { notMerge: true },
    { replaceMerge: "series" },
  ])("submits the required source scope for graphic changes with %j", async (updateOptions) => {
    registerExtension();
    const x = ref(0);
    const chart = mountChart(() => ({ option: pieOption(1), updateOptions }), undefined, {
      graphic: () => [
        h(GRect, { id: "changing", x: x.value, width: 10, height: 10 }),
        h(GRect, { id: "stable", x: 30, width: 10, height: 10 }),
      ],
    });
    await nextTick();
    await flushAnimationFrame();
    const before = chart
      .getZr()
      .storage.getDisplayList()
      .filter((el) => String(el.id) === "changing" || String(el.id) === "stable");
    const submit = vi.spyOn(chart.chart!, "setOption");
    chart.dispatchAction({ type: "legendUnSelect", name: "B" });
    x.value = 20;
    await nextTick();
    await flushAnimationFrame();
    expect(submit).toHaveBeenCalledOnce();
    const payload = submit.mock.calls[0][0];
    const fullSource = updateOptions?.notMerge || updateOptions?.replaceMerge === "series";
    expect(Boolean(payload.series)).toBe(Boolean(fullSource));
    expect(chart.getOption().series).toHaveLength(2);
    if (!updateOptions?.notMerge) {
      expect(chart.getZr().storage.getDisplayList()).toEqual(expect.arrayContaining(before));
      expect(chart.getOption().legend).toMatchObject([{ selected: { B: false } }]);
      expect(payload.graphic).toMatchObject({ elements: [{ id: "changing", shape: { x: 20 } }] });
      expect((payload.graphic as { elements: unknown[] }).elements).toHaveLength(1);
    }
  });

  it("preserves a sibling's running animation during a different node update", async () => {
    registerExtension();
    const x = ref(0);
    const chart = mountChart(() => ({ option: { animation: true } }), undefined, {
      graphic: () => [
        h(GRect, { id: "changing", x: x.value, width: 10, height: 10 }),
        h(GRect, {
          id: "animated",
          width: 10,
          height: 10,
          transition: "shape",
          enterFrom: { shape: { x: 100 } },
          enterAnimation: { duration: 10000 },
        }),
      ],
    });
    await nextTick();
    const sibling = chart
      .getZr()
      .storage.getDisplayList()
      .find((el) => String(el.id) === "animated")!;
    expect(sibling).toBeDefined();
    const animators = [...sibling.animators];
    expect(animators.length).toBeGreaterThan(0);
    x.value = 20;
    await nextTick();
    expect(chart.getZr().storage.getDisplayList()).toContain(sibling);
    expect(sibling.animators).toEqual(animators);
  });

  it("follows opaque wrapper and child-only Fragment order with independent keys and IDs", async () => {
    registerExtension();
    const order = ref(["a", "b"]);
    const localOrder = ref(["1", "2"]);
    const Wrapper = defineComponent({
      props: { name: { type: String, required: true } },
      setup(props) {
        const color = inject<string>("marker-color")!;
        return () =>
          h("section", [
            h(
              Fragment,
              localOrder.value.map((suffix) =>
                h(GRect, {
                  key: suffix,
                  id: `child-${props.name}-${suffix}`,
                  width: 10,
                  height: 10,
                  fill: color,
                }),
              ),
            ),
          ]);
      },
    });
    const GraphicTree = defineComponent({
      setup() {
        provide("marker-color", "red");
        return () => order.value.map((name) => h(Wrapper, { key: name, name }));
      },
    });
    const chart = mountChart(() => ({ option: {} }), undefined, {
      graphic: () => [h(GraphicTree)],
    });
    const ids = () =>
      (
        chart.getOption().graphic as Array<{
          elements: Array<{ id: string; style?: { fill?: string } }>;
        }>
      )[0].elements.slice(1);
    await nextTick();
    expect(ids().map(({ id }) => id)).toEqual(["child-a-1", "child-a-2", "child-b-1", "child-b-2"]);
    order.value = ["b", "a"];
    await nextTick();
    await flushAnimationFrame();
    expect(ids().map(({ id }) => id)).toEqual(["child-b-1", "child-b-2", "child-a-1", "child-a-2"]);
    localOrder.value = ["2", "1"];
    await nextTick();
    await flushAnimationFrame();
    expect(ids().map(({ id }) => id)).toEqual(["child-b-2", "child-b-1", "child-a-2", "child-a-1"]);
    expect(ids().every(({ style }) => style?.fill === "red")).toBe(true);
    localOrder.value = ["1"];
    await nextTick();
    await flushAnimationFrame();
    expect(ids().map(({ id }) => id)).toEqual(["child-b-1", "child-a-1"]);
  });

  it("restores the full graphic snapshot after a failed delta", async () => {
    registerExtension();
    const x = ref(0);
    const visible = ref(true);
    const errors: unknown[] = [];
    const chart = mountChart(() => ({ option: pieOption(1) }), errors, {
      graphic: () => [
        h(GRect, { id: "changing", x: x.value, width: 10, height: 10 }),
        visible.value ? h(GRect, { id: "removed", width: 10, height: 10 }) : null,
      ],
    });
    await nextTick();
    const failure = new Error("graphic delta failed");
    const submit = vi.spyOn(chart.chart!, "setOption").mockImplementationOnce(() => {
      throw failure;
    });
    visible.value = false;
    x.value = 20;
    await nextTick();
    expect(errors).toEqual([failure]);
    x.value = 30;
    await nextTick();
    expect(submit.mock.lastCall?.[1]).toMatchObject({ notMerge: true });
    expect(chart.getOption().series).toHaveLength(2);
    expect(chart.getOption().graphic).toMatchObject([
      { elements: [{}, { id: "changing", shape: { x: 30 } }] },
    ]);
    expect((chart.getOption().graphic as Array<{ elements: unknown[] }>)[0].elements).toHaveLength(
      2,
    );
  });
});
