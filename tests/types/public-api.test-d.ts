import ECharts, { type AutoResize } from "../../src";
import type { EChartsType } from "../../src/types";

type Instance = InstanceType<typeof ECharts>;
type Props = Instance["$props"];
type Assert<T extends true> = T;
type IsEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type IsReadonly<T, K extends keyof T> = IsEqual<Pick<T, K>, Readonly<Pick<T, K>>>;

type _chartType = Assert<IsEqual<Instance["chart"], EChartsType | undefined>>;
type _rootType = Assert<IsEqual<Instance["root"], HTMLElement | undefined>>;
type _setOptionType = Assert<IsEqual<Instance["setOption"], EChartsType["setOption"]>>;
type _stateIsReadonly = Assert<IsReadonly<Instance, "chart" | "root">>;
type _autoresizeType = Assert<IsEqual<Props["autoresize"], AutoResize | undefined>>;
type _loadingType = Assert<IsEqual<Props["loadingType"], string | undefined>>;
type CurrentEChartsMethod =
  | "getZr"
  | "getId"
  | "isSSR"
  | "getDevicePixelRatio"
  | "makeActionFromEvent"
  | "updateLabelLayout"
  | "convertToLayout"
  | "getVisual"
  | "renderToCanvas"
  | "renderToSVGString"
  | "getSvgDataURL";
type _currentEChartsMethods = Assert<
  IsEqual<Extract<CurrentEChartsMethod, keyof Instance>, CurrentEChartsMethod>
>;
