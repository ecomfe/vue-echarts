import { init } from "echarts/core";
import type {
  SetOptionOpts,
  ECElementEvent,
  ElementEvent,
  EChartsOption
} from "echarts";
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
export type Option = EChartsOption;

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
