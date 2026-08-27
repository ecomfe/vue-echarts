import ECharts from "../../src";
import { GGroup, GRect } from "../../src/graphic/components";

type Assert<T extends true> = T;
type IsEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Slots = InstanceType<typeof ECharts>["$slots"];
type GroupSlots = InstanceType<typeof GGroup>["$slots"];
type RectSlots = InstanceType<typeof GRect>["$slots"];

export type GraphicSlotIsExposed = Assert<"graphic" extends keyof Slots ? true : false>;
export type GroupOnlyAcceptsDefaultSlot = Assert<IsEqual<keyof GroupSlots, "default">>;
export type LeafGraphicRejectsSlots = Assert<IsEqual<keyof RectSlots, never>>;
