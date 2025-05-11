/* eslint-disable @typescript-eslint/ban-types */
import type { Ref, DefineComponent, InjectionKey } from "vue";
import type {
  Option,
  Theme,
  InitOptions,
  UpdateOptions,
  LoadingOptions,
  AutoResize,
  EChartsType,
  Emits,
  ThemeInjection,
  InitOptionsInjection,
  UpdateOptionsInjection,
  LoadingOptionsInjection
} from "./types";

declare const THEME_KEY: InjectionKey<ThemeInjection>;
declare const INIT_OPTIONS_KEY: InjectionKey<InitOptionsInjection>;
declare const UPDATE_OPTIONS_KEY: InjectionKey<UpdateOptionsInjection>;
declare const LOADING_OPTIONS_KEY: InjectionKey<LoadingOptionsInjection>;

declare type ChartProps = {
  theme?: Theme;
  initOptions?: InitOptions;
  updateOptions?: UpdateOptions;
  loadingOptions?: LoadingOptions;
  option?: Option;
  autoresize?: AutoResize;
  loading?: boolean;
  group?: string;
  manualUpdate?: boolean;
};

// convert Emits to Props
// click => onClick
declare type ChartEventProps = {
  [key in keyof Emits as key extends string
    ? `on${Capitalize<key>}`
    : never]?: Emits[key];
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
  ChartProps & ChartEventProps,
  {
    root: Ref<HTMLElement | undefined>;
    chart: Ref<EChartsType | undefined>;
  },
  {},
  {},
  ChartMethods
>;

export default Chart;
export { THEME_KEY, INIT_OPTIONS_KEY, UPDATE_OPTIONS_KEY, LOADING_OPTIONS_KEY };
