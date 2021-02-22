/* eslint-disable @typescript-eslint/no-explicit-any */
import { Ref } from "vue-demi";
import { EChartsType, Option } from "../types";

const METHOD_NAMES = [
  "getWidth",
  "getHeight",
  "getDom",
  "getOption",
  "resize",
  "dispatchAction",
  "convertToPixel",
  "convertFromPixel",
  "getDataURL",
  "getConnectedDataURL",
  "appendData",
  "clear",
  "isDisposed",
  "dispose"
] as const;
type MethodName = typeof METHOD_NAMES[number];

type PublicMethods = Pick<EChartsType, MethodName>;

export function usePublicAPI(
  chart: Ref<EChartsType | undefined>,
  init: (option?: Option) => void
) {
  function makePublicMethod<T extends MethodName>(
    name: T
  ): (...args: Parameters<EChartsType[T]>) => ReturnType<EChartsType[T]> {
    return (...args) => {
      if (!chart.value) {
        init();
      }

      if (!chart.value) {
        throw new Error("ECharts is not initialized yet.");
      }
      return (chart.value[name] as any).apply(chart.value, args);
    };
  }

  function makeAnyMethod<T extends MethodName>(
    name: T
  ): (...args: any[]) => ReturnType<EChartsType[T]> {
    return makePublicMethod(name) as any;
  }

  function makePublicMethods(): PublicMethods {
    const methods = Object.create(null);
    METHOD_NAMES.forEach(name => {
      methods[name] = makePublicMethod(name);
    });

    return methods as PublicMethods;
  }

  return {
    ...makePublicMethods(),
    dispatchAction: makeAnyMethod("dispatchAction"),
    getDataURL: makeAnyMethod("getDataURL"),
    getConnectedDataURL: makeAnyMethod("getConnectedDataURL")
  };
}
