import VChart, {
  type PublicComponent,
  type Exposed,
  type VChartSlotsExtension,
  type SlotsType,
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
type Slots = Instance["$slots"];

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
  IsEqual<Parameters<NonNullable<Slots["custom"]>>[0], { value: number }>
>;
export type GraphicSlotIsPreserved = Assert<"graphic" extends keyof Slots ? true : false>;
export type GraphicUsesSameExtension = Assert<IsEqual<GraphicSlotsExtension, VChartSlotsExtension>>;
export type SlotMetadataIsPreserved = Assert<
  SlotsType extends VueSlotsType<VChartSlotsExtension> ? true : false
>;
export type InferredPropsArePreserved = Assert<
  IsEqual<Instance["$props"]["manualUpdate"], boolean | undefined>
>;

// All exported names remain usable in consumers that emit their own declarations.
export type WrapperComponent = PublicComponent<
  Record<never, never>,
  Exposed,
  Record<never, never>,
  SlotsType
>;
