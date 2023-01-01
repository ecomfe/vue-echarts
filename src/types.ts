import { init, type SetOptionOpts } from "echarts/core";
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

type EChartsMouseEventName =
  | "click"
  | "dblclick"
  | "mousedown"
  | "mousemove"
  | "mouseup"
  | "mouseover"
  | "mouseout"
  | "globalout"
  | "contextmenu";
type EChartsOtherEventName =
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
  | "globalcursortaken"
  | "rendered"
  | "finished";
type ZRenderEventName =
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
type OtherEventName = EChartsOtherEventName | `zr:${ZRenderEventName}`;

// See https://echarts.apache.org/en/api.html#events.Mouse%20events
interface MouseEventParams {
  componentType: string;
  seriesType: string;
  seriesIndex: number;
  seriesName: string;
  name: string;
  dataIndex: number;
  color: string;
}

type MouseEmits = {
  [k in EChartsMouseEventName]: (params: MouseEventParams) => boolean;
};

type OtherEmits = {
  [key in OtherEventName]: null;
};

export type Emits = MouseEmits & OtherEmits;
