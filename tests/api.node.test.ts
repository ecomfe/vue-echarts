import { describe, it, expect, vi } from "vitest";
import { shallowRef } from "vue";

import { usePublicAPI } from "../src/composables/api";
import type { PublicMethods } from "../src/composables/api";
import type { EChartsType } from "../src/types";

describe("usePublicAPI", () => {
  it("throws until chart instance is available", () => {
    const chart = shallowRef<EChartsType | undefined>(undefined);
    const api = usePublicAPI(chart);

    expect(() => api.getWidth()).toThrowError("ECharts is not initialized yet.");

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

    type MethodName = (typeof methodNames)[number];
    type ChartImpl = Record<MethodName, (...args: unknown[]) => unknown> & { marker: string };

    const chartImpl = { marker: "chart-instance" } as ChartImpl;
    const callArgs: Record<string, unknown[]> = {};

    methodNames.forEach((name) => {
      chartImpl[name] = vi.fn(function (this: ChartImpl, ...args: unknown[]) {
        callArgs[name] = args;
        expect(this.marker).toBe("chart-instance");
        return `result:${name}`;
      });
    });

    const chart = shallowRef<EChartsType | undefined>();
    chart.value = chartImpl as unknown as EChartsType;
    const api = usePublicAPI(chart);

    type ArgsByName = { [K in MethodName]: Parameters<PublicMethods[K]> };
    const argsByName: ArgsByName = {
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

    function invoke<K extends MethodName>(name: K, args: ArgsByName[K]) {
      const method = api[name] as (...methodArgs: ArgsByName[K]) => ReturnType<PublicMethods[K]>;
      const result = method(...args);
      expect(result).toBe(`result:${name}`);
      expect(chartImpl[name]).toHaveBeenCalledTimes(1);
      expect(callArgs[name]).toEqual(args);
    }

    methodNames.forEach((name) => {
      invoke(name, argsByName[name]);
    });
  });

  it("throws again if the chart instance is cleared after initialization", () => {
    const chart = shallowRef<EChartsType | undefined>();
    const api = usePublicAPI(chart);

    const chartImpl = {
      getWidth: vi.fn(() => 240),
    };

    chart.value = chartImpl as unknown as EChartsType;

    expect(api.getWidth()).toBe(240);
    expect(chartImpl.getWidth).toHaveBeenCalledTimes(1);

    chart.value = undefined;

    expect(() => api.getWidth()).toThrowError("ECharts is not initialized yet.");
  });
});
