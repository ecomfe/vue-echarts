/* eslint-disable @typescript-eslint/ban-types */
import type { Ref, DefineComponent } from "vue-demi";
import type { Option, InitOptions, UpdateOptions, EChartsType } from "./types";

declare const LOADING_OPTIONS_KEY = "ecLoadingOptions";
declare const THEME_KEY = "ecTheme";
declare const INIT_OPTIONS_KEY = "ecInitOptions";
declare const UPDATE_OPTIONS_KEY = "ecUpdateOptions";

declare type ChartProps = {
  loading?: boolean;
  loadingOptions?: Record<string, unknown>;
  autoresize?: boolean;
  option?: Option;
  theme?: string | Record<string, unknown>;
  initOptions?: InitOptions;
  updateOptions?: UpdateOptions;
  group?: string;
  manualUpdate?: boolean;
};

type MethodNames =
  | "getWidth"
  | "getHeight"
  | "getDom"
  | "getOption"
  | "resize"
  | "dispatchAction"
  | "convertToPixel"
  | "convertFromPixel"
  | "containPixel"
  | "getDataURL"
  | "getConnectedDataURL"
  | "appendData"
  | "clear"
  | "isDisposed"
  | "dispose"
  | "setOption";

declare type ChartMethods = Pick<EChartsType, MethodNames>;

declare const Chart: DefineComponent<
  ChartProps,
  {
    root: Ref<HTMLElement | undefined>;
    chart: Ref<EChartsType | undefined>;
  },
  {},
  {},
  ChartMethods
>;

export default Chart;
export { INIT_OPTIONS_KEY, LOADING_OPTIONS_KEY, THEME_KEY, UPDATE_OPTIONS_KEY };
