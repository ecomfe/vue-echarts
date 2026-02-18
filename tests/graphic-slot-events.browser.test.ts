import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";

import { render } from "./helpers/testing";
import { flushAnimationFrame } from "./helpers/dom";
import { createEChartsModule } from "./helpers/mock";
import ECharts from "../src/ECharts";
import { registerExtension } from "../src/graphic/extension";
import { GRect } from "../src/graphic/components";
import { getLastGraphicRootChildren, setupGraphicSlotSuite } from "./helpers/graphic-slot";

vi.mock("echarts/core", () => createEChartsModule());

const suite = setupGraphicSlotSuite();

describe("graphic slot event handling", () => {
  it("dispatches chart click events to latest reactive handlers", async () => {
    registerExtension();

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
    const firstNode = getLastGraphicRootChildren(chartStub).find(
      (item) => item.id === "event-node",
    ) as Record<string, unknown> | undefined;
    if (!firstNode || typeof firstNode.onclick !== "function") {
      throw new Error("Expected first click handler to exist.");
    }

    const eventA = { value: 1 };
    (firstNode.onclick as (params: unknown) => void)(eventA);
    expect(onClickA).toHaveBeenCalledWith(eventA);
    expect(onClickB).not.toHaveBeenCalled();

    currentHandler.value = onClickB;
    await nextTick();
    await flushAnimationFrame();

    const secondNode = getLastGraphicRootChildren(chartStub).find(
      (item) => item.id === "event-node",
    ) as Record<string, unknown> | undefined;
    if (!secondNode || typeof secondNode.onclick !== "function") {
      throw new Error("Expected second click handler to exist.");
    }

    const eventB = { value: 2 };
    (secondNode.onclick as (params: unknown) => void)(eventB);
    expect(onClickA).toHaveBeenCalledTimes(1);
    expect(onClickB).toHaveBeenCalledWith(eventB);
  });

  it("rebinds chart events when handler channels are added or removed", async () => {
    registerExtension();

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
    const firstNode = getLastGraphicRootChildren(chartStub).find(
      (item) => item.id === "event-node",
    ) as Record<string, unknown> | undefined;
    if (!firstNode || typeof firstNode.onclick !== "function") {
      throw new Error("Expected first click handler to exist.");
    }

    (firstNode.onclick as (params: unknown) => void)({ value: 1 });
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onMousemove).toHaveBeenCalledTimes(0);

    enableClick.value = false;
    enableMousemove.value = true;
    await nextTick();
    await flushAnimationFrame();

    const secondNode = getLastGraphicRootChildren(chartStub).find(
      (item) => item.id === "event-node",
    ) as Record<string, unknown> | undefined;
    if (!secondNode) {
      throw new Error("Expected second node to exist.");
    }
    expect(secondNode.onclick).toBeUndefined();
    expect(typeof secondNode.onmousemove).toBe("function");

    expect(onClick).toHaveBeenCalledTimes(1);
    (secondNode.onmousemove as (params: unknown) => void)({ value: 3 });
    expect(onMousemove).toHaveBeenCalledTimes(1);

    enableMousemove.value = false;
    await nextTick();
    await flushAnimationFrame();

    const thirdNode = getLastGraphicRootChildren(chartStub).find(
      (item) => item.id === "event-node",
    ) as Record<string, unknown> | undefined;
    if (!thirdNode) {
      throw new Error("Expected third node to exist.");
    }
    expect(thirdNode.onmousemove).toBeUndefined();
    expect(onMousemove).toHaveBeenCalledTimes(1);
  });

  it("supports handler transitions: function to array to empty", async () => {
    registerExtension();

    const option = ref({ series: [{ type: "line", data: [1, 2, 3] }] });
    const fnA = vi.fn();
    const fnB = vi.fn();
    const fnC = vi.fn();
    const stage = ref<"single" | "array" | "none">("single");

    const Root = defineComponent({
      setup() {
        return () => {
          const onClick =
            stage.value === "single"
              ? fnA
              : stage.value === "array"
                ? ([fnB, fnC] as unknown as (params: unknown) => void)
                : undefined;
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
    const singleNode = getLastGraphicRootChildren(chartStub).find(
      (item) => item.id === "channel-node",
    ) as Record<string, unknown> | undefined;
    if (!singleNode || typeof singleNode.onclick !== "function") {
      throw new Error("Expected first click handler to exist.");
    }

    (singleNode.onclick as (params: unknown) => void)({});
    expect(fnA).toHaveBeenCalledTimes(1);
    expect(fnB).toHaveBeenCalledTimes(0);
    expect(fnC).toHaveBeenCalledTimes(0);

    stage.value = "array";
    await nextTick();
    await flushAnimationFrame();

    const arrayNode = getLastGraphicRootChildren(chartStub).find(
      (item) => item.id === "channel-node",
    ) as Record<string, unknown> | undefined;
    if (!arrayNode || typeof arrayNode.onclick !== "function") {
      throw new Error("Expected array click handler to exist.");
    }

    (arrayNode.onclick as (params: unknown) => void)({});
    expect(fnA).toHaveBeenCalledTimes(1);
    expect(fnB).toHaveBeenCalledTimes(1);
    expect(fnC).toHaveBeenCalledTimes(1);

    stage.value = "none";
    await nextTick();
    await flushAnimationFrame();

    const noneNode = getLastGraphicRootChildren(chartStub).find(
      (item) => item.id === "channel-node",
    ) as Record<string, unknown> | undefined;
    if (!noneNode) {
      throw new Error("Expected none node to exist.");
    }
    expect(noneNode.onclick).toBeUndefined();
    expect(fnB).toHaveBeenCalledTimes(1);
    expect(fnC).toHaveBeenCalledTimes(1);
  });

  it("supports once handlers via onClickOnce", async () => {
    registerExtension();

    const option = ref({ series: [{ type: "line", data: [1, 2, 3] }] });
    const onClickOnce = vi.fn();

    const Root = defineComponent({
      setup() {
        return () =>
          h(
            ECharts,
            { option: option.value },
            {
              graphic: () =>
                h(GRect, {
                  id: "once-node",
                  x: 10,
                  y: 10,
                  width: 10,
                  height: 10,
                  onClickOnce,
                }),
            },
          );
      },
    });

    render(Root);
    await nextTick();
    await flushAnimationFrame();

    const chartStub = suite.getChartStub();
    const node = getLastGraphicRootChildren(chartStub).find((item) => item.id === "once-node") as
      | Record<string, unknown>
      | undefined;
    if (!node || typeof node.onclick !== "function") {
      throw new Error("Expected once click handler to exist.");
    }

    (node.onclick as (params: unknown) => void)({ value: 1 });
    (node.onclick as (params: unknown) => void)({ value: 2 });

    expect(onClickOnce).toHaveBeenCalledTimes(1);
  });
});
