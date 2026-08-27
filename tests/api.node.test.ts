import { describe, it, expect, vi } from "vitest";
import { shallowRef } from "vue";
import type { Ref } from "vue";

import { usePublicAPI } from "../src/composables/api";
import type { PublicMethods } from "../src/composables/api";
import type { EChartsType } from "../src/types";

describe("usePublicAPI", () => {
  it("only guards methods that require a chart instance", () => {
    const chart = shallowRef<EChartsType | undefined>(undefined);
    const api = usePublicAPI(chart, vi.fn(), () => false);

    expect(() => api.getWidth()).toThrowError("ECharts is not initialized yet.");
    expect(api.isDisposed()).toBe(false);

    const chartImpl = {
      getWidth: vi.fn(() => 320),
      getHeight: vi.fn(() => 180),
      isDisposed: vi.fn(() => false),
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

  it("reads the current chart once per forwarded call", () => {
    const instance = {
      getWidth: vi.fn(() => 320),
      isDisposed: vi.fn(() => false),
    } as unknown as EChartsType;
    const readChart = vi.fn(() => instance);
    const chart = {
      get value() {
        return readChart();
      },
    } as Ref<EChartsType | undefined>;
    const api = usePublicAPI(chart, vi.fn(), () => false);

    expect(api.getWidth()).toBe(320);
    expect(readChart).toHaveBeenCalledOnce();
  });

  it("forwards public calls to the ECharts instance", () => {
    const methodNames = [
      "getWidth",
      "getHeight",
      "getDom",
      "getZr",
      "getId",
      "getOption",
      "isSSR",
      "getDevicePixelRatio",
      "resize",
      "makeActionFromEvent",
      "dispatchAction",
      "updateLabelLayout",
      "convertToPixel",
      "convertToLayout",
      "convertFromPixel",
      "containPixel",
      "getVisual",
      "renderToCanvas",
      "renderToSVGString",
      "getSvgDataURL",
      "getDataURL",
      "getConnectedDataURL",
      "appendData",
      "clear",
    ] as const;

    type MethodName = (typeof methodNames)[number];
    type ChartImpl = Record<MethodName, (...args: unknown[]) => unknown> & {
      isDisposed: () => boolean;
      marker: string;
    };

    const chartImpl = {
      isDisposed: vi.fn(() => false),
      marker: "chart-instance",
    } as unknown as ChartImpl;
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
    const dispose = vi.fn();
    const api = usePublicAPI(chart, dispose, () => false);

    type ArgsByName = { [K in MethodName]: Parameters<PublicMethods[K]> };
    const argsByName: ArgsByName = {
      getWidth: [],
      getHeight: [],
      getDom: [],
      getZr: [],
      getId: [],
      getOption: [],
      isSSR: [],
      getDevicePixelRatio: [],
      resize: [{ width: 200, height: 100 }],
      makeActionFromEvent: [{ type: "legendselectchanged" }],
      dispatchAction: [{ type: "highlight" }],
      updateLabelLayout: [],
      convertToPixel: ["grid", [0, 1]],
      convertToLayout: ["grid", [0, 1]],
      convertFromPixel: ["grid", [10, 20]],
      containPixel: ["series", [1, 2]],
      getVisual: ["series", "color"],
      renderToCanvas: [{ pixelRatio: 2 }],
      renderToSVGString: [{ useViewBox: true }],
      getSvgDataURL: [],
      getDataURL: [],
      getConnectedDataURL: [],
      appendData: [{ seriesIndex: 0, data: [1, 2, 3] }],
      clear: [],
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

    api.dispose();
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("throws again if the chart instance is cleared after initialization", () => {
    const chart = shallowRef<EChartsType | undefined>();
    const api = usePublicAPI(chart, vi.fn(), () => false);

    const chartImpl = {
      getWidth: vi.fn(() => 240),
      isDisposed: vi.fn(() => false),
    };

    chart.value = chartImpl as unknown as EChartsType;

    expect(api.getWidth()).toBe(240);
    expect(chartImpl.getWidth).toHaveBeenCalledTimes(1);

    chart.value = undefined;

    expect(() => api.getWidth()).toThrowError("ECharts is not initialized yet.");
  });

  it("rejects method calls after the underlying chart is externally disposed", () => {
    const chart = shallowRef<EChartsType | undefined>();
    const getWidth = vi.fn(() => {
      throw new Error("Disposed internals accessed");
    });
    chart.value = {
      getWidth,
      isDisposed: vi.fn(() => true),
    } as unknown as EChartsType;
    const api = usePublicAPI(chart, vi.fn(), () => false);

    expect(api.isDisposed()).toBe(true);
    expect(() => api.getWidth()).toThrowError("ECharts has been disposed.");
    expect(getWidth).not.toHaveBeenCalled();
  });

  it("reports terminal disposal when a chart method can no longer run", () => {
    const chart = shallowRef<EChartsType | undefined>();
    const api = usePublicAPI(chart, vi.fn(), () => true);

    expect(() => api.getWidth()).toThrowError("ECharts has been disposed.");
  });
});
