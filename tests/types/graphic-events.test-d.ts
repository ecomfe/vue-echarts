/* eslint-disable @typescript-eslint/no-unused-vars */

import type { ElementEvent } from "echarts/core";

import type { GraphicEmits, GraphicEventName, GraphicOnEventName } from "../../src/graphic";
import { GRect } from "../../src/graphic/components";

type RectProps = InstanceType<typeof GRect>["$props"];

type Assert<T extends true> = T;
type IsAssignable<From, To> = [From] extends [To] ? true : false;
type IsEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

type ClickHandler = NonNullable<RectProps["onClick"]>;
type MouseoverHandler = NonNullable<RectProps["onMouseover"]>;
type DragHandler = NonNullable<RectProps["onDrag"]>;
type DblclickHandler = NonNullable<RectProps["onDblclick"]>;

type ClickPayload = Parameters<ClickHandler>[0];
type MouseoverPayload = Parameters<MouseoverHandler>[0];
type DragPayload = Parameters<DragHandler>[0];
type DblclickPayload = Parameters<DblclickHandler>[0];
type GraphicClickPayload = Parameters<GraphicEmits["click"]>[0];

type _assertClickPayload = Assert<IsEqual<ClickPayload, ElementEvent>>;
type _assertMouseoverPayload = Assert<IsEqual<MouseoverPayload, ElementEvent>>;
type _assertDragPayload = Assert<IsEqual<DragPayload, ElementEvent>>;
type _assertDblclickPayload = Assert<IsEqual<DblclickPayload, ElementEvent>>;
type _assertExportedPayload = Assert<IsEqual<GraphicClickPayload, ElementEvent>>;
type _assertEventNameExport = Assert<IsAssignable<"click", GraphicEventName>>;
type _assertDblclickEventNameExport = Assert<IsAssignable<"dblclick", GraphicEventName>>;
type _assertMouseoverEventNameExport = Assert<IsAssignable<"mouseover", GraphicEventName>>;
type _assertOnEventNameExport = Assert<IsAssignable<"onclick", GraphicOnEventName>>;

// @ts-expect-error unknown graphic event should be rejected
type _unknownEvent = RectProps["onFoo"];

// @ts-expect-error unsupported graphic event should be rejected
type _unsupportedEvent = RectProps["onMouseenter"];

// @ts-expect-error globalout is zr-level, not element onxxx
type _unsupportedGlobalout = RectProps["onGlobalout"];

type WrongClick = (params: string) => void;

// @ts-expect-error click handler payload should be ElementEvent
type _wrongPayload = Assert<IsAssignable<WrongClick, ClickHandler>>;
