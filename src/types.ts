import { init } from "echarts/core";

export type EChartsType = ReturnType<typeof init>;
type SetOptionType = EChartsType["setOption"];
export type OptionType = Parameters<SetOptionType>[0];
