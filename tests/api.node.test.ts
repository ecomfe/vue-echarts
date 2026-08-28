import { describe, it, expect, vi } from "vitest";
import { shallowRef } from "vue";

import { usePublicAPI } from "../src/composables/api";
import type { EChartsType } from "../src/types";

describe("usePublicAPI", () => {
  it("guards chart access across initialization", () => {
    const chart = shallowRef<EChartsType>();
    const api = usePublicAPI(chart, vi.fn(), () => false);

    expect(() => api.getWidth()).toThrowError("ECharts is not initialized yet.");
    expect(api.isDisposed()).toBe(false);

    const chartImpl = {
      getWidth: vi.fn(() => 320),
    };
    chart.value = chartImpl as unknown as EChartsType;

    expect(api.getWidth()).toBe(320);

    chart.value = undefined;

    expect(() => api.getWidth()).toThrowError("ECharts is not initialized yet.");
  });

  it("exposes and forwards every public chart method", () => {
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
    type ChartImpl = Record<MethodName, (...args: unknown[]) => unknown>;

    const chartImpl = {} as ChartImpl;
    const args = ["argument", 42];

    methodNames.forEach((name) => {
      chartImpl[name] = vi.fn(function (this: ChartImpl, ...received: unknown[]) {
        expect(this).toBe(chartImpl);
        expect(received).toEqual(args);
        return `result:${name}`;
      });
    });

    const chart = shallowRef<EChartsType | undefined>();
    chart.value = chartImpl as unknown as EChartsType;
    const dispose = vi.fn();
    const api = usePublicAPI(chart, dispose, () => false);

    methodNames.forEach((name) => {
      const method = api[name] as (...args: unknown[]) => unknown;
      expect(method(...args)).toBe(`result:${name}`);
      expect(chartImpl[name]).toHaveBeenCalledOnce();
    });

    api.dispose();
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("reports terminal disposal when a chart method can no longer run", () => {
    const chart = shallowRef<EChartsType | undefined>();
    const api = usePublicAPI(chart, vi.fn(), () => true);

    expect(() => api.getWidth()).toThrowError("ECharts has been disposed.");
  });
});
