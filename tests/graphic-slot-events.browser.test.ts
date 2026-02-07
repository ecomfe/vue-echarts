import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";

import { render } from "./helpers/testing";
import { flushAnimationFrame } from "./helpers/dom";
import { createEChartsModule } from "./helpers/mock";
import ECharts from "../src/ECharts";
import { registerGraphicExtension } from "../src/graphic/extension";
import { GRect } from "../src/graphic/components";
import { setupGraphicSlotSuite } from "./helpers/graphic-slot";

vi.mock("echarts/core", () => createEChartsModule());

const suite = setupGraphicSlotSuite();

describe("graphic slot event handling", () => {
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

    const chartStub = suite.getChartStub();
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

    const chartStub = suite.getChartStub();
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

  it("supports handler transitions: function to array to empty", async () => {
    registerGraphicExtension();

    const option = ref({ series: [{ type: "line", data: [1, 2, 3] }] });
    const fnA = vi.fn();
    const fnB = vi.fn();
    const fnC = vi.fn();
    const stage = ref<"single" | "array" | "none">("single");

    const Root = defineComponent({
      setup() {
        return () => {
          const onClick =
            stage.value === "single" ? fnA : stage.value === "array" ? [fnB, fnC] : undefined;
          return h(
            ECharts,
            { option: option.value },
            {
              graphic: () =>
                h(GRect, { id: "channel-node", x: 10, y: 10, width: 10, height: 10, onClick }),
            },
          );
        };
      },
    });

    render(Root);
    await nextTick();
    await flushAnimationFrame();

    const chartStub = suite.getChartStub();
    const clickBinding = chartStub.on.mock.calls.find(
      (call: unknown[]) => call[0] === "click",
    )?.[1] as (params: unknown) => void;
    if (!clickBinding) {
      throw new Error("Expected click binding to exist.");
    }

    clickBinding({ info: { __veGraphicId: "channel-node" } });
    expect(fnA).toHaveBeenCalledTimes(1);
    expect(fnB).toHaveBeenCalledTimes(0);
    expect(fnC).toHaveBeenCalledTimes(0);

    stage.value = "array";
    await nextTick();
    await flushAnimationFrame();

    clickBinding({ info: { __veGraphicId: "channel-node" } });
    expect(fnA).toHaveBeenCalledTimes(1);
    expect(fnB).toHaveBeenCalledTimes(1);
    expect(fnC).toHaveBeenCalledTimes(1);

    chartStub.off.mockClear();
    stage.value = "none";
    await nextTick();
    await flushAnimationFrame();

    expect(chartStub.off.mock.calls.some((call: unknown[]) => call[0] === "click")).toBe(true);
    clickBinding({ info: { __veGraphicId: "channel-node" } });
    expect(fnB).toHaveBeenCalledTimes(1);
    expect(fnC).toHaveBeenCalledTimes(1);
  });
});
