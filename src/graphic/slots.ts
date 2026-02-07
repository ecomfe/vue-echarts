import type { VChartExtensionSlots } from "../extensions";

declare module "../extensions" {
  interface VChartExtensionSlots {
    graphic?: unknown;
  }
}

export type __VChartGraphicSlot = VChartExtensionSlots;
