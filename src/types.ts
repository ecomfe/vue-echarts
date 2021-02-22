import { init } from "echarts/core";
import { Ref } from "vue";

type InitType = typeof init;
export type InitParameters = Parameters<InitType>;
export type Theme = NonNullable<InitParameters[1]>;
export type ThemeInjection = Theme | null | Ref<Theme | null>;
export type InitOptions = NonNullable<InitParameters[2]>;
export type InitOptionsInjection = InitOptions | null | Ref<InitOptions | null>;

export type EChartsType = ReturnType<InitType>;
type SetOptionType = EChartsType["setOption"];
export type Option = Parameters<SetOptionType>[0];

// TODO: Wait for apache/echarts#14289 to ship in v5.1,
// so that we can use SetOptionOpts directly
export interface UpdateOptions {
  notMerge?: boolean;
  lazyUpdate?: boolean;
  silent?: boolean;
  replaceMerge?: any;
  transition?: any;
}
export type UpdateOptionsInjection = UpdateOptions | null | Ref<UpdateOptions | null>;
