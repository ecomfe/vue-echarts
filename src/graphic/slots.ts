import type { VChartSlotsExtension } from "../slots";

declare module "../slots" {
  interface VChartSlotsExtension {
    graphic?: unknown;
  }
}

export type __VChartGraphicSlot = VChartSlotsExtension;
