import { init } from "echarts/core";
import { mouseEvents, elementEvents, otherEvents } from "./events";
import type { SetOptionOpts, ECElementEvent, ElementEvent } from "echarts";
import type { Ref } from "vue";

export type Injection<T> = T | null | Ref<T | null> | { value: T | null };

type InitType = typeof init;
export type InitParameters = Parameters<InitType>;
export type Theme = NonNullable<InitParameters[1]>;
export type ThemeInjection = Injection<Theme>;
export type InitOptions = NonNullable<InitParameters[2]>;

export type InitOptionsInjection = Injection<InitOptions>;

export type UpdateOptions = SetOptionOpts;
export type UpdateOptionsInjection = Injection<UpdateOptions>;

export type EChartsType = ReturnType<InitType>;
type ZRenderType = ReturnType<EChartsType["getZr"]>;
export type EventTarget = EChartsType | ZRenderType;

type SetOptionType = EChartsType["setOption"];
export type Option = Parameters<SetOptionType>[0];

export type LoadingOptions = {
  text?: string;
  textColor?: string;
  fontSize?: number | string;
  fontWeight?: number | string;
  fontStyle?: string;
  fontFamily?: string;
  maskColor?: string;
  showSpinner?: boolean;
  color?: string;
  spinnerRadius?: number;
  lineWidth?: number;
  zlevel?: number;
};

type MouseEventName = (typeof mouseEvents)[number];

type ElementEventName = (typeof elementEvents)[number] | MouseEventName;

type ZRenderEventName = `zr:${ElementEventName}`;

type OtherEventName = (typeof otherEvents)[number];

type MouseEmits = {
  [key in MouseEventName]: (params: ECElementEvent) => boolean;
};

type ZRenderEmits = {
  [key in ZRenderEventName]: (params: ElementEvent) => boolean;
};

type OtherEmits = {
  [key in OtherEventName]: null;
};

export type Emits = MouseEmits &
  OtherEmits & {
    rendered: (params: { elapsedTime: number }) => boolean;
    finished: () => boolean;
  } & ZRenderEmits;
