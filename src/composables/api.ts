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
  "isDisposed",
  "dispose",
] as const;

type MethodName = (typeof METHOD_NAMES)[number];

export type PublicMethods = Pick<EChartsType, MethodName>;

export function usePublicAPI(
  chart: Ref<EChartsType | undefined>,
): PublicMethods {
  function makePublicMethod<T extends MethodName>(name: T): EChartsType[T] {
    // Return a function that matches the signature of EChartsType[T]
    const fn = function (this: unknown, ...args: unknown[]): unknown {
      if (!chart.value) {
        throw new Error("ECharts is not initialized yet.");
      }
      // Use Reflect.apply to call the method with proper context
      return Reflect.apply(chart.value[name], chart.value, args);
    };
    return fn as EChartsType[T];
  }

  // Build the methods object with proper typing
  const methods = METHOD_NAMES.reduce(
    (acc, name) => {
      acc[name] = makePublicMethod(name);
      return acc;
    },
    {} as Record<MethodName, unknown>,
  ) as PublicMethods;

  return methods;
}
