import ECharts from "../../src";

type Assert<T extends true> = T;
type Slots = InstanceType<typeof ECharts>["$slots"];

export type GraphicSlotIsExposed = Assert<"graphic" extends keyof Slots ? true : false>;
