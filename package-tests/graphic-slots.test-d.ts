import ECharts from "vue-echarts";
import "vue-echarts/graphic";

type Assert<T extends true> = T;
type Slots = InstanceType<typeof ECharts>["$slots"];

export type GraphicSlotIsPublished = Assert<"graphic" extends keyof Slots ? true : false>;
