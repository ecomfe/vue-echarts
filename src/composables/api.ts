import type { Ref } from "vue";
import type { EChartsType } from "../types";

const METHOD_NAMES = [
  "getWidth",
  "getHeight",
  "getDom",
  "getOption",
  "setTheme",
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

type MethodName = (typeof METHOD_NAMES)[number];

export type PublicMethods = Pick<EChartsType, MethodName>;

export function usePublicAPI(
  chart: Ref<EChartsType | undefined>,
): PublicMethods {
  function makePublicMethod<T extends MethodName>(
    name: T,
  ): (...args: Parameters<EChartsType[T]>) => ReturnType<EChartsType[T]> {
    return (...args) => {
      if (!chart.value) {
        throw new Error("ECharts is not initialized yet.");
      }
      return (chart.value[name] as any).apply(chart.value, args);
    };
  }

  function makePublicMethods(): PublicMethods {
    const methods = Object.create(null);
    METHOD_NAMES.forEach((name) => {
      methods[name] = makePublicMethod(name);
    });

    return methods as PublicMethods;
  }

  return makePublicMethods();
}
