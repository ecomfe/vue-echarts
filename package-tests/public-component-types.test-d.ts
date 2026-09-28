import VChart, {
  type DefineChartComponent,
  type VChartExposed,
  type VChartSlotsExtension,
  type VChartSlotsType,
} from "vue-echarts";
import type { VChartSlotsExtension as GraphicSlotsExtension } from "vue-echarts/graphic";
import type { SlotsType } from "vue";
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
  IsEqual<Pick<Instance, keyof VChartExposed>, { [K in keyof VChartExposed]: VChartExposed[K] }>
>;
export type ExposedIncludesSetOption = Assert<
  IsEqual<VChartExposed["setOption"], EChartsType["setOption"]>
>;
export type ExposedPreservesZRender = Assert<IsEqual<VChartExposed["getZr"], EChartsType["getZr"]>>;
export type ExposedStateIsReadonly = Assert<
  IsEqual<Pick<VChartExposed, "chart" | "root">, Readonly<Pick<VChartExposed, "chart" | "root">>>
>;
export type CustomSlotProps = Assert<
  IsEqual<Parameters<NonNullable<Slots["custom"]>>[0], { value: number }>
>;
export type GraphicSlotIsPreserved = Assert<"graphic" extends keyof Slots ? true : false>;
export type GraphicUsesSameExtension = Assert<IsEqual<GraphicSlotsExtension, VChartSlotsExtension>>;
export type SlotMetadataIsPreserved = Assert<
  VChartSlotsType extends SlotsType<VChartSlotsExtension> ? true : false
>;
export type InferredPropsArePreserved = Assert<
  IsEqual<Instance["$props"]["manualUpdate"], boolean | undefined>
>;

// All exported names remain usable in consumers that emit their own declarations.
export type WrapperComponent = DefineChartComponent<
  Record<never, never>,
  VChartExposed,
  Record<never, never>,
  VChartSlotsType
>;
