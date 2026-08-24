/* eslint-disable @typescript-eslint/no-unused-vars */

import type {
  AxisBreakChangedEvent,
  DownplayPayload,
  ECElementEvent,
  ElementEvent,
  HighlightPayload,
  SelectChangedEvent,
} from "echarts/core";

import ECharts from "../../src";

type Props = InstanceType<typeof ECharts>["$props"];

type Assert<T extends true> = T;
type IsAssignable<From, To> = [From] extends [To] ? true : false;
type IsEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type HandlerPayload<K extends keyof Props> =
  NonNullable<Props[K]> extends (params: infer P) => unknown ? P : never;

type CamelCaseHandlerName =
  | "onDblClick"
  | "onContextMenu"
  | "onGlobalOut"
  | `onMouse${Capitalize<"out" | "over" | "up" | "down" | "move">}`
  | "onSelectChanged"
  | `onLegend${Capitalize<
      "selectChanged" | "selected" | "unselected" | "selectAll" | "inverseSelect" | "scroll"
    >}`
  | `onData${Capitalize<"zoom" | "rangeSelected" | "viewChanged">}`
  | `on${Capitalize<"graph" | "geo" | "tree">}Roam`
  | `onTimeline${Capitalize<"changed" | "playChanged">}`
  | "onMagicTypeChanged"
  | `onGeo${Capitalize<"selectChanged" | "selected" | "unselected">}`
  | "onAxisBreakChanged"
  | "onAxisAreaSelected"
  | `onBrush${Capitalize<"end" | "selected">}`
  | "onGlobalCursorTaken"
  | "onZr:dblClick"
  | "onZr:contextMenu"
  | "onZr:globalOut"
  | `onZr:mouse${Capitalize<"wheel" | "out" | "over" | "up" | "down" | "move">}`
  | `onZr:drag${Capitalize<"start" | "end" | "enter" | "leave" | "over">}`;
type OnceHandlerName =
  | "onClickOnce"
  | "onDataZoomOnce"
  | "onAxisBreakChangedOnce"
  | "onZr:mouseMoveOnce";
type NativeHandler = NonNullable<
  Props["onNative:click" | "onNative:clickOnce" | "onNative:chart-ready"]
>;

type _camelCaseEvents = Assert<CamelCaseHandlerName extends keyof Props ? true : false>;
type _onceEvents = Assert<OnceHandlerName extends keyof Props ? true : false>;
type _highlightPayload = Assert<IsEqual<HandlerPayload<"onHighlight">, HighlightPayload>>;
type _downplayOncePayload = Assert<IsEqual<HandlerPayload<"onDownplayOnce">, DownplayPayload>>;
type _selectChangedPayload = Assert<IsEqual<HandlerPayload<"onSelectchanged">, SelectChangedEvent>>;
type _selectChangedOncePayload = Assert<
  IsEqual<HandlerPayload<"onSelectChangedOnce">, SelectChangedEvent>
>;
type _axisBreakPayload = Assert<
  IsEqual<HandlerPayload<"onAxisBreakChanged">, AxisBreakChangedEvent>
>;
type _axisBreakOncePayload = Assert<
  IsEqual<HandlerPayload<"onAxisBreakChangedOnce">, AxisBreakChangedEvent>
>;
type _mouseMovePayload = Assert<IsEqual<HandlerPayload<"onMouseMove">, ECElementEvent>>;
type _zrMouseMovePayload = Assert<IsEqual<HandlerPayload<"onZr:mouseMove">, ElementEvent>>;
type _nativeAcceptsMouseHandler = Assert<IsAssignable<(params: MouseEvent) => void, NativeHandler>>;
type _nativeAcceptsCustomHandler = Assert<
  IsAssignable<(params: CustomEvent) => void, NativeHandler>
>;
type _lowercaseEventsRemain = Assert<
  "onAxisbreakchanged" | "onBrushend" | "onZr:mousemove" extends keyof Props ? true : false
>;
