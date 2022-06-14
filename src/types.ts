import { init, SetOptionOpts } from "echarts/core";
import { Ref } from "vue";

type InitType = typeof init;
export type InitParameters = Parameters<InitType>;
export type Theme = NonNullable<InitParameters[1]>;
export type ThemeInjection = Theme | null | Ref<Theme | null>;
export type InitOptions = NonNullable<InitParameters[2]>;
export type InitOptionsInjection = InitOptions | null | Ref<InitOptions | null>;

export type EChartsType = ReturnType<InitType>;
type ZRenderType = ReturnType<EChartsType["getZr"]>;
export type EventTarget = EChartsType | ZRenderType;
type SetOptionType = EChartsType["setOption"];
export type Option = Parameters<SetOptionType>[0];

export type UpdateOptions = Omit<SetOptionOpts, "notMerge">;
export type UpdateOptionsInjection =
  | UpdateOptions
  | null
  | Ref<UpdateOptions | null>;
