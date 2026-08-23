/* eslint-disable @typescript-eslint/no-unused-vars */

import type { ElementEvent } from "echarts/core";

import type { GraphicEmits, GraphicEventName, GraphicOnEventName } from "../../src/graphic";
import { GRect } from "../../src/graphic/components";

type RectProps = InstanceType<typeof GRect>["$props"];

type Assert<T extends true> = T;
type IsAssignable<From, To> = [From] extends [To] ? true : false;
type IsEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

type HandlerName = "onClick" | "onMouseover" | "onDrag" | "onDblclick";
type HandlerPayload = Parameters<NonNullable<RectProps[HandlerName]>>[0];
type ClickHandler = NonNullable<RectProps["onClick"]>;

type _assertHandlerPayload = Assert<IsEqual<HandlerPayload, ElementEvent>>;
type _assertExportedPayload = Assert<IsEqual<Parameters<GraphicEmits["click"]>[0], ElementEvent>>;
type _assertEventNameExport = Assert<
  IsEqual<GraphicEventName, Exclude<ElementEvent["type"], "globalout">>
>;
type _assertOnEventNameExport = Assert<IsEqual<GraphicOnEventName, `on${GraphicEventName}`>>;

// @ts-expect-error unknown graphic event should be rejected
type _unknownEvent = RectProps["onFoo"];

// @ts-expect-error unsupported graphic event should be rejected
type _unsupportedEvent = RectProps["onMouseenter"];

// @ts-expect-error globalout is zr-level, not element onxxx
type _unsupportedGlobalout = RectProps["onGlobalout"];

type WrongClick = (params: string) => void;

// @ts-expect-error click handler payload should be ElementEvent
type _wrongPayload = Assert<IsAssignable<WrongClick, ClickHandler>>;
