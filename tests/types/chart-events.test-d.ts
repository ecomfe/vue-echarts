/* eslint-disable @typescript-eslint/no-unused-vars */

import type {
  AxisBreakChangedEvent,
  ECElementEvent,
  ElementEvent,
  SelectChangedEvent,
} from "echarts/core";

import ECharts from "../../src";

type Props = InstanceType<typeof ECharts>["$props"];

type Assert<T extends true> = T;
type IsAssignable<From, To> = [From] extends [To] ? true : false;
type IsEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

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
  | "onSelectChangedOnce"
  | "onAxisBreakChangedOnce"
  | "onZr:mouseMoveOnce";
type SelectChangedHandler = NonNullable<Props["onSelectchanged"]>;
type SelectChangedOnceHandler = NonNullable<Props["onSelectChangedOnce"]>;
type AxisBreakHandler = NonNullable<Props["onAxisBreakChanged"]>;
type AxisBreakOnceHandler = NonNullable<Props["onAxisBreakChangedOnce"]>;
type MouseMoveHandler = NonNullable<Props["onMouseMove"]>;
type ZRenderMouseMoveHandler = NonNullable<Props["onZr:mouseMove"]>;
type NativeHandler = NonNullable<
  Props["onNative:click" | "onNative:clickOnce" | "onNative:chart-ready"]
>;

type _camelCaseEvents = Assert<CamelCaseHandlerName extends keyof Props ? true : false>;
type _onceEvents = Assert<OnceHandlerName extends keyof Props ? true : false>;
type _selectChangedPayload = Assert<
  IsEqual<Parameters<SelectChangedHandler>[0], SelectChangedEvent>
>;
type _selectChangedOncePayload = Assert<
  IsEqual<Parameters<SelectChangedOnceHandler>[0], SelectChangedEvent>
>;
type _axisBreakPayload = Assert<IsEqual<Parameters<AxisBreakHandler>[0], AxisBreakChangedEvent>>;
type _axisBreakOncePayload = Assert<
  IsEqual<Parameters<AxisBreakOnceHandler>[0], AxisBreakChangedEvent>
>;
type _mouseMovePayload = Assert<IsEqual<Parameters<MouseMoveHandler>[0], ECElementEvent>>;
type _zrMouseMovePayload = Assert<IsEqual<Parameters<ZRenderMouseMoveHandler>[0], ElementEvent>>;
type _nativeAcceptsMouseHandler = Assert<IsAssignable<(params: MouseEvent) => void, NativeHandler>>;
type _nativeAcceptsCustomHandler = Assert<
  IsAssignable<(params: CustomEvent) => void, NativeHandler>
>;
type _lowercaseEventsRemain = Assert<
  "onAxisbreakchanged" | "onBrushend" | "onZr:mousemove" extends keyof Props ? true : false
>;
