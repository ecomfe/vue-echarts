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
  const isDisposed = () => isPubliclyDisposed() || (chart.value?.isDisposed() ?? false);

  const getInstance = (): EChartsType => {
    const instance = chart.value;
    if (isPubliclyDisposed() || instance?.isDisposed()) {
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
  api.isDisposed = isDisposed;
  return api as PublicMethods;
}
