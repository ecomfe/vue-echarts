import { describe, it, expect, vi } from "vitest";
import { ref, type Ref } from "vue";

import { usePublicAPI, type PublicMethods } from "../src/composables/api";
import type { EChartsType } from "../src/types";

describe("usePublicAPI", () => {
  it("throws until chart instance is available", () => {
    const chart = ref<EChartsType | undefined>(undefined);
    const api = usePublicAPI(chart as Ref<EChartsType | undefined>);

    expect(() => api.getWidth()).toThrowError(
      "ECharts is not initialized yet.",
    );

    const chartImpl = {
      getWidth: vi.fn(() => 320),
      getHeight: vi.fn(() => 180),
    };
    chart.value = chartImpl as unknown as EChartsType;

    let width: number | undefined;
    expect(() => {
      width = api.getWidth();
    }).not.toThrow();
    expect(width).toBe(320);
    expect(chartImpl.getWidth).toHaveBeenCalledTimes(1);
    expect(chartImpl.getHeight).not.toHaveBeenCalled();
    expect(api.getHeight()).toBe(180);
    expect(chartImpl.getHeight).toHaveBeenCalledTimes(1);
  });

  it("forwards public calls to the ECharts instance", () => {
    const methodNames = [
      "getWidth",
      "getHeight",
      "getDom",
      "getOption",
      "resize",
      "dispatchAction",
      "convertToPixel",
      "convertFromPixel",
      "containPixel",
      "getDataURL",
      "getConnectedDataURL",
      "appendData",
      "clear",
      "isDisposed",
      "dispose",
    ] as const;

    const chartImpl: Record<string, any> = { marker: "chart-instance" };
    const callArgs: Record<string, any[]> = {};

    methodNames.forEach((name) => {
      chartImpl[name] = vi.fn(function (
        this: Record<string, any>,
        ...args: any[]
      ) {
        callArgs[name] = args;
        expect(this.marker).toBe("chart-instance");
        return `result:${name}`;
      });
    });

    const chart = ref<EChartsType | undefined>();
    chart.value = chartImpl as unknown as EChartsType;
    const api = usePublicAPI(chart as Ref<EChartsType | undefined>);

    const argsByName: Record<(typeof methodNames)[number], any[]> = {
      getWidth: [],
      getHeight: [],
      getDom: [],
      getOption: [],
      resize: [{ width: 200, height: 100 }],
      dispatchAction: [{ type: "highlight" }],
      convertToPixel: ["grid", [0, 1]],
      convertFromPixel: ["grid", [10, 20]],
      containPixel: ["series", [1, 2]],
      getDataURL: [],
      getConnectedDataURL: [],
      appendData: [{ seriesIndex: 0, data: [1, 2, 3] }],
      clear: [],
      isDisposed: [],
      dispose: [],
    };

    methodNames.forEach((name) => {
      const result = (
        api[name as keyof PublicMethods] as (...args: any[]) => any
      )(...argsByName[name]);
      expect(result).toBe(`result:${name}`);
      expect(chartImpl[name]).toHaveBeenCalledTimes(1);
      expect(callArgs[name]).toEqual(argsByName[name]);
    });
  });

  it("throws again if the chart instance is cleared after initialization", () => {
    const chart = ref<EChartsType | undefined>();
    const api = usePublicAPI(chart as Ref<EChartsType | undefined>);

    const chartImpl = {
      getWidth: vi.fn(() => 240),
    };

    chart.value = chartImpl as unknown as EChartsType;

    expect(api.getWidth()).toBe(240);
    expect(chartImpl.getWidth).toHaveBeenCalledTimes(1);

    chart.value = undefined;

    expect(() => api.getWidth()).toThrowError(
      "ECharts is not initialized yet.",
    );
  });
});
