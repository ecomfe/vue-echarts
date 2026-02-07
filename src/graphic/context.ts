import type { InjectionKey, Ref } from "vue";

import type { GraphicCollector } from "./collector";

export const GRAPHIC_COLLECTOR_KEY: InjectionKey<GraphicCollector> = Symbol(
  "vue-echarts:graphic-collector",
);
export const GRAPHIC_PARENT_ID_KEY: InjectionKey<Ref<string | null>> = Symbol(
  "vue-echarts:graphic-parent-id",
);
export const GRAPHIC_ORDER_KEY: InjectionKey<Ref<Map<string, number>>> = Symbol(
  "vue-echarts:graphic-order",
);
