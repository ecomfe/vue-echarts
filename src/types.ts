import { init } from "echarts/core";

import type { SetOptionOpts, ECElementEvent, ElementEvent } from "echarts/core";
import type { Ref, ShallowRef, WritableComputedRef, ComputedRef } from "vue";

export type MaybeRef<T = any> =
  | T
  | Ref<T>
  | ShallowRef<T>
  | WritableComputedRef<T>;
export type MaybeRefOrGetter<T = any> =
  | MaybeRef<T>
  | ComputedRef<T>
  | (() => T);
export type Injection<T> = MaybeRefOrGetter<T | null>;

type InitType = typeof init;
export type InitParameters = Parameters<InitType>;
export type Theme = NonNullable<InitParameters[1]>;
export type ThemeInjection = Injection<Theme>;
export type InitOptions = NonNullable<InitParameters[2]>;

export type InitOptionsInjection = Injection<InitOptions>;

export type UpdateOptions = SetOptionOpts;
export type UpdateOptionsInjection = Injection<UpdateOptions>;

export type EChartsType = ReturnType<InitType>;

type SetOptionType = EChartsType["setOption"];
export type Option = Parameters<SetOptionType>[0];

export type AutoResize =
  | boolean
  | {
      throttle?: number;
      onResize?: () => void;
    };

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
export type LoadingOptionsInjection = Injection<LoadingOptions>;

type MouseEventName =
  | "click"
  | "dblclick"
  | "mouseout"
  | "mouseover"
  | "mouseup"
  | "mousedown"
  | "mousemove"
  | "contextmenu"
  | "globalout";

type ElementEventName =
  | MouseEventName
  | "mousewheel"
  | "drag"
  | "dragstart"
  | "dragend"
  | "dragenter"
  | "dragleave"
  | "dragover"
  | "drop";

type ZRenderEventName = `zr:${ElementEventName}`;

type OtherEventName =
  | "highlight"
  | "downplay"
  | "selectchanged"
  | "legendselectchanged"
  | "legendselected"
  | "legendunselected"
  | "legendselectall"
  | "legendinverseselect"
  | "legendscroll"
  | "datazoom"
  | "datarangeselected"
  | "graphroam"
  | "georoam"
  | "treeroam"
  | "timelinechanged"
  | "timelineplaychanged"
  | "restore"
  | "dataviewchanged"
  | "magictypechanged"
  | "geoselectchanged"
  | "geoselected"
  | "geounselected"
  | "axisareaselected"
  | "brush"
  | "brushEnd"
  | "brushselected"
  | "globalcursortaken";

type MouseEmits = {
  [key in MouseEventName]: (params: ECElementEvent) => void;
};

type ZRenderEmits = {
  [key in ZRenderEventName]: (params: ElementEvent) => void;
};

type OtherEmits = {
  [key in OtherEventName]: (params: any) => void;
};

export type Emits = MouseEmits &
  OtherEmits & {
    rendered: (params: { elapsedTime: number }) => void;
    finished: () => void;
  } & ZRenderEmits;
