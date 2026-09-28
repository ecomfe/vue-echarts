import ECharts from "./ECharts";
import type { Slot } from "vue";

export interface VChartSlotsExtension {
  graphic?: Slot;
}

export default ECharts;
export * from "./ECharts";
export type { AutoResize, LoadingOptions, PublicComponent } from "./types";
export type { SlotsType } from "./composables/slot";
