import type { Ref } from "vue";
import type { EChartsType } from "../types";

const METHOD_NAMES = [
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

type MethodName = (typeof METHOD_NAMES)[number];

export type PublicMethods = Pick<EChartsType, MethodName | "dispose" | "isDisposed">;

export function usePublicAPI(
  chart: Ref<EChartsType | undefined>,
  dispose: () => void,
  isPubliclyDisposed: () => boolean,
): PublicMethods {
  const disposeIfDisposed = (instance: EChartsType | undefined): boolean => {
    if (isPubliclyDisposed()) {
      return true;
    }
    if (!instance?.isDisposed()) {
      return false;
    }
    dispose();
    return true;
  };

  const getInstance = (): EChartsType => {
    const instance = chart.value;
    if (disposeIfDisposed(instance)) {
      throw new Error("ECharts has been disposed.");
    }
    if (!instance) {
      throw new Error("ECharts is not initialized yet.");
    }
    return instance;
  };

  const api: Record<string, (...args: unknown[]) => unknown> = {};
  for (const name of METHOD_NAMES) {
    api[name] = (...args: unknown[]): unknown => {
      const instance = getInstance();
      return Reflect.apply(instance[name], instance, args);
    };
  }
  api.dispose = dispose;
  api.isDisposed = () => disposeIfDisposed(chart.value);
  return api as PublicMethods;
}
