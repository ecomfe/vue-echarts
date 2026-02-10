import type { Slot } from "vue";

declare module "./index" {
  interface VChartSlotsExtension {
    graphic?: Slot;
  }
}
