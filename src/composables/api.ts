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
] as const;

type MethodName = (typeof METHOD_NAMES)[number];

export type PublicMethods = Pick<EChartsType, MethodName | "dispose">;

export function usePublicAPI(
  chart: Ref<EChartsType | undefined>,
  dispose: () => void,
): PublicMethods {
  return {
    ...Object.fromEntries(
      METHOD_NAMES.map((name) => [
        name,
        (...args: unknown[]): unknown => {
          const instance = chart.value;
          if (!instance) {
            throw new Error("ECharts is not initialized yet.");
          }
          return Reflect.apply(instance[name], instance, args);
        },
      ]),
    ),
    dispose,
  } as PublicMethods;
}
