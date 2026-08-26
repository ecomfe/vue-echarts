import { init } from "echarts/core";

import type {
  SetOptionOpts,
  ECElementEvent,
  ElementEvent,
  AxisBreakChangedEvent,
  SelectChangedEvent,
  HighlightPayload,
  DownplayPayload,
  Payload,
} from "echarts/core";
import type { MaybeRefOrGetter } from "vue";

export type Injection<T> = MaybeRefOrGetter<T | null | undefined>;

type InitType = typeof init;
export type InitParameters = Parameters<InitType>;
export type Theme = NonNullable<InitParameters[1]>;
export type ThemeInjection = Injection<Theme>;
export type InitOptions = NonNullable<InitParameters[2]>;
export type InitOptionsInjection = Injection<InitOptions>;
export type UpdateOptions = SetOptionOpts;
export type UpdateOptionsInjection = Injection<UpdateOptions>;

export type EChartsType = ReturnType<InitType>;

export type SetOptionType = EChartsType["setOption"];
export type Option = Parameters<SetOptionType>[0];

export type AutoResize =
  | boolean
  | {
      throttle?: number;
      onResize?: () => void;
    };

export type FontStyle = "normal" | "italic" | "oblique";
export type FontWeight = "normal" | "bold" | "bolder" | "lighter" | number;

export type LoadingOptions = {
  [key: string]: unknown;
  text?: string;
  textColor?: string;
  fontSize?: number;
  fontWeight?: FontWeight;
  fontStyle?: FontStyle;
  fontFamily?: string;
  maskColor?: string;
  showSpinner?: boolean;
  color?: string;
  spinnerRadius?: number;
  lineWidth?: number;
  zlevel?: number;
};
export type LoadingOptionsInjection = Injection<LoadingOptions>;

type ChartMouseEventName =
  | "click"
  | "dblclick"
  | "mouseover"
  | "mouseout"
  | "mousemove"
  | "mousedown"
  | "mouseup"
  | "globalout"
  | "contextmenu";

// Vue only capitalizes the first letter; runtime listeners also accept these idiomatic aliases.
type MouseEventAlias =
  | "dblClick"
  | "contextMenu"
  | "globalOut"
  | `mouse${Capitalize<"out" | "over" | "up" | "down" | "move">}`;

export type ElementEventAlias =
  | MouseEventAlias
  | "mouseWheel"
  | `drag${Capitalize<"start" | "end" | "enter" | "leave" | "over">}`;

type ZRenderEventName = `zr:${ElementEvent["type"] | ElementEventAlias}`;

type OtherEventName =
  | "legendselectchanged"
  | "legendselected"
  | "legendunselected"
  | "legendselectall"
  | "legendinverseselect"
  | "legendscroll"
  | "datazoom"
  | "datarangeselected"
  | `${"graph" | "geo" | "tree" | "sankey"}roam`
  | "dragnode"
  | "treeexpandandcollapse"
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
  | "brushend"
  | "brushselected"
  | `${"show" | "hide"}tip`
  | "updateaxispointer"
  | "globalcursortaken";

type OtherEventAlias =
  | `legend${Capitalize<
      "selectChanged" | "selected" | "unselected" | "selectAll" | "inverseSelect" | "scroll"
    >}`
  | `data${Capitalize<"zoom" | "rangeSelected" | "viewChanged">}`
  | `${"graph" | "geo" | "tree" | "sankey"}Roam`
  | "dragNode"
  | "treeExpandAndCollapse"
  | `timeline${Capitalize<"changed" | "playChanged">}`
  | "magicTypeChanged"
  | `geo${Capitalize<"selectChanged" | "selected" | "unselected">}`
  | "axisAreaSelected"
  | `brush${Capitalize<"end" | "selected">}`
  | `${"show" | "hide"}Tip`
  | "updateAxisPointer"
  | "globalCursorTaken";

type MouseEmits = {
  [key in ChartMouseEventName | MouseEventAlias]: (params: ECElementEvent) => void;
};

type ZRenderEmits = {
  [key in ZRenderEventName]: (params: ElementEvent) => void;
};

type NativeEmits = {
  [key in `native:${string}`]: (params: any) => void;
};

type OtherEmits = {
  [key in OtherEventName | OtherEventAlias]: (params: Payload) => void;
};

export type WithOnce<T> = T & {
  [key in keyof T as `${key & string}Once`]: T[key];
};

type ChartEmits = MouseEmits &
  OtherEmits & {
    highlight: (params: HighlightPayload) => void;
    downplay: (params: DownplayPayload) => void;
    selectchanged: (params: SelectChangedEvent) => void;
    selectChanged: (params: SelectChangedEvent) => void;
    axisbreakchanged: (params: AxisBreakChangedEvent) => void;
    axisBreakChanged: (params: AxisBreakChangedEvent) => void;
    rendered: (params: { elapsedTime: number }) => void;
    finished: () => void;
  } & ZRenderEmits;

export type Emits = WithOnce<ChartEmits> & NativeEmits;
