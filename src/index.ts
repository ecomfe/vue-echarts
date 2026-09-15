import ECharts from "./ECharts";
import type { Slot } from "vue";

export interface VChartSlotsExtension {
  graphic?: Slot;
}

export default ECharts;
export * from "./ECharts";
export type { AutoResize, LoadingOptions } from "./types";
export type { PublicComponent } from "./types";
export type { PublicMethods } from "./composables/api";
export type { SlotsTypes } from "./composables/slot";
