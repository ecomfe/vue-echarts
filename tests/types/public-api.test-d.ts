/* eslint-disable @typescript-eslint/no-unused-vars */

import type { ComponentExposed } from "vue-component-type-helpers";

import ECharts from "../../src";
import type { EChartsType } from "../../src/types";
import type { EChartsElement } from "../../src/wc";

type Exposed = ComponentExposed<typeof ECharts>;
type Assert<T extends true> = T;
type IsEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type IsReadonly<T, K extends keyof T> = IsEqual<Pick<T, K>, Readonly<Pick<T, K>>>;

type _chartType = Assert<IsEqual<Exposed["chart"], EChartsType | undefined>>;
type _rootType = Assert<IsEqual<Exposed["root"], EChartsElement | undefined>>;
type _stateIsReadonly = Assert<IsReadonly<Exposed, "chart" | "root">>;
