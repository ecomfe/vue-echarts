/* eslint-disable @typescript-eslint/no-unused-vars */

import type { ComponentExposed } from "vue-component-type-helpers";

import ECharts, { type AutoResize } from "../../src";
import type { EChartsType } from "../../src/types";

type Exposed = ComponentExposed<typeof ECharts>;
type Props = InstanceType<typeof ECharts>["$props"];
type Assert<T extends true> = T;
type IsEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type IsReadonly<T, K extends keyof T> = IsEqual<Pick<T, K>, Readonly<Pick<T, K>>>;

type _chartType = Assert<IsEqual<Exposed["chart"], EChartsType | undefined>>;
type _rootType = Assert<IsEqual<Exposed["root"], HTMLElement | undefined>>;
type _stateIsReadonly = Assert<IsReadonly<Exposed, "chart" | "root">>;
type _autoresizeType = Assert<IsEqual<Props["autoresize"], AutoResize | undefined>>;
type _loadingType = Assert<IsEqual<Props["loadingType"], string | undefined>>;
type CurrentEChartsMethod =
  | "getZr"
  | "getId"
  | "isSSR"
  | "getDevicePixelRatio"
  | "updateLabelLayout"
  | "convertToLayout"
  | "getVisual"
  | "renderToCanvas"
  | "renderToSVGString"
  | "getSvgDataURL";
type _currentEChartsMethods = Assert<
  IsEqual<Extract<CurrentEChartsMethod, keyof Exposed>, CurrentEChartsMethod>
>;
