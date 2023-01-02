import {
  init,
  type SetOptionOpts,
  type ECElementEvent,
  type ElementEvent
} from "echarts/core";
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

type ElementEventName =
  | "click"
  | "dblclick"
  | "mousewheel"
  | "mouseout"
  | "mouseover"
  | "mouseup"
  | "mousedown"
  | "mousemove"
  | "contextmenu"
  | "drag"
  | "dragstart"
  | "dragend"
  | "dragenter"
  | "dragleave"
  | "dragover"
  | "drop"
  | "globalout";

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

type ElementEmits = {
  [key in ElementEventName]: (params: ECElementEvent) => boolean;
};

type ZRenderEmits = {
  [key in ZRenderEventName]: (params: ElementEvent) => boolean;
};

type OtherEmits = {
  [key in OtherEventName]: null;
};

export type Emits = ElementEmits &
  OtherEmits & {
    rendered: (params: { elapsedTime: number }) => boolean;
    finished: () => boolean;
  } & ZRenderEmits;
