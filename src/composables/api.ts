import type { Ref } from "vue";
import type { EChartsType } from "../types";

const METHOD_NAMES = [
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
    if (isDisposed()) {
      throw new Error("ECharts has been disposed.");
    }
    const instance = chart.value;
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
