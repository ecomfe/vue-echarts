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

function getLastSetOptionArg(chartStub: { setOption: { mock: { calls: unknown[][] } } }): any {
  const lastCall = chartStub.setOption.mock.calls.at(-1);
  if (!lastCall) {
    throw new Error("Expected chart.setOption to be called at least once.");
  }

  return lastCall[0];
}

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

      let optionArg = getLastSetOptionArg(chartStub);
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

      optionArg = getLastSetOptionArg(chartStub);
      expect(optionArg.series[0].data).toEqual([7, 8, 9]);
      expect(optionArg.graphic.elements[0].children[0].shape).toMatchObject({ x: 42, y: 10 });
      expect(
        warnSpy.mock.calls.some((call: unknown[]) => String(call[0]).includes("manual-update")),
      ).toBe(true);
    });
  });

  it("applies click handlers only after explicit setOption in manual-update mode", async () => {
    registerGraphicExtension();

    const exposed = shallowRef<Exposed>();
    const onClickA = vi.fn();
    const onClickB = vi.fn();
    const currentHandler = ref(onClickA);

    const Root = defineComponent({
      setup() {
        return () =>
          h(
            ECharts,
            { manualUpdate: true, ref: (value) => (exposed.value = value as Exposed) },
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
      expect(chartStub.getOption()).toBeUndefined();

      exposed.value?.setOption({ series: [{ type: "line", data: [1, 2, 3] }] });
      await nextTick();
      await flushAnimationFrame();

      let optionArg = getLastSetOptionArg(chartStub);
      const firstNode = optionArg.graphic.elements[0].children[0] as Record<string, unknown>;
      const eventA = { value: 1 };
      (firstNode.onclick as (params: unknown) => void)(eventA);
      expect(onClickA).toHaveBeenCalledWith(eventA);
      expect(onClickB).not.toHaveBeenCalled();

      currentHandler.value = onClickB;
      await nextTick();
      await flushAnimationFrame();

      expect(chartStub.setOption).toHaveBeenCalledTimes(1);

      const eventB = { value: 2 };
      (firstNode.onclick as (params: unknown) => void)(eventB);
      expect(onClickA).toHaveBeenCalledTimes(2);
      expect(onClickB).not.toHaveBeenCalled();

      exposed.value?.setOption({ series: [{ type: "line", data: [4, 5, 6] }] });
      await nextTick();
      await flushAnimationFrame();

      optionArg = getLastSetOptionArg(chartStub);
      const secondNode = optionArg.graphic.elements[0].children[0] as Record<string, unknown>;
      const eventC = { value: 3 };
      (secondNode.onclick as (params: unknown) => void)(eventC);
      expect(onClickB).toHaveBeenCalledWith(eventC);
      expect(
        warnSpy.mock.calls.some((call: unknown[]) => String(call[0]).includes("manual-update")),
      ).toBe(true);
    });
  });
});
