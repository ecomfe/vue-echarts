import VChart, {
  type Component,
  type Exposed,
  type VChartSlotsExtension,
  type Slots,
} from "vue-echarts";
import type { VChartSlotsExtension as GraphicSlotsExtension } from "vue-echarts/graphic";
import type { SlotsType as VueSlotsType } from "vue";
import type { EChartsType } from "echarts/core";

declare module "vue-echarts" {
  interface VChartSlotsExtension {
    custom?: (props: { value: number }) => unknown;
  }
}

type Assert<T extends true> = T;
type IsEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Instance = InstanceType<typeof VChart>;
type InstanceSlots = Instance["$slots"];

export type ExposedMatchesInstance = Assert<
  IsEqual<Pick<Instance, keyof Exposed>, { [K in keyof Exposed]: Exposed[K] }>
>;
export type ExposedIncludesSetOption = Assert<
  IsEqual<Exposed["setOption"], EChartsType["setOption"]>
>;
export type ExposedPreservesZRender = Assert<IsEqual<Exposed["getZr"], EChartsType["getZr"]>>;
export type ExposedStateIsReadonly = Assert<
  IsEqual<Pick<Exposed, "chart" | "root">, Readonly<Pick<Exposed, "chart" | "root">>>
>;
export type CustomSlotProps = Assert<
  IsEqual<Parameters<NonNullable<InstanceSlots["custom"]>>[0], { value: number }>
>;
export type GraphicSlotIsPreserved = Assert<"graphic" extends keyof InstanceSlots ? true : false>;
export type GraphicUsesSameExtension = Assert<IsEqual<GraphicSlotsExtension, VChartSlotsExtension>>;
export type SlotMetadataIsPreserved = Assert<
  Slots extends VueSlotsType<VChartSlotsExtension> ? true : false
>;
export type InferredPropsArePreserved = Assert<
  IsEqual<Instance["$props"]["manualUpdate"], boolean | undefined>
>;

// All exported names remain usable in consumers that emit their own declarations.
export type WrapperComponent = Component<
  Record<never, never>,
  Exposed,
  Record<never, never>,
  Slots
>;
