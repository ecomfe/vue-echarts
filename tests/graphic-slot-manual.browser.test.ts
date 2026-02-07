import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, onMounted, ref, shallowRef } from "vue";
import type { ComponentExposed } from "vue-component-type-helpers";

import { render } from "./helpers/testing";
import { flushAnimationFrame, withConsoleWarnAsync } from "./helpers/dom";
import { createEChartsModule } from "./helpers/mock";
import ECharts from "../src/ECharts";
import { registerGraphicExtension } from "../src/graphic/extension";
import { GRect } from "../src/graphic/components";
import { setupGraphicSlotSuite } from "./helpers/graphic-slot";

vi.mock("echarts/core", () => createEChartsModule());

type Exposed = ComponentExposed<typeof ECharts>;

const suite = setupGraphicSlotSuite();

describe("graphic slot manual-update behavior", () => {
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

      const chartStub = suite.getChartStub();
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

      const chartStub = suite.getChartStub();
      const initialCalls = chartStub.setOption.mock.calls.length;

      x.value = 22;
      await nextTick();
      await flushAnimationFrame();

      expect(chartStub.setOption.mock.calls.length).toBe(initialCalls);
      expect(
        warnSpy.mock.calls.some((call: unknown[]) => String(call[0]).includes("manual-update")),
      ).toBe(true);
    });
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

      const chartStub = suite.getChartStub();
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

      const chartStub = suite.getChartStub();
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
});
