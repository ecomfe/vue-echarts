import type { ElementEvent } from "echarts/core";
import type { ElementEventAlias, WithOnce } from "../types";

export type GraphicEventName = Exclude<ElementEvent["type"], "globalout">;

export const GRAPHIC_EVENTS = {
  click: true,
  dblclick: true,
  mousewheel: true,
  mouseout: true,
  mouseover: true,
  mouseup: true,
  mousedown: true,
  mousemove: true,
  contextmenu: true,
  drag: true,
  dragstart: true,
  dragend: true,
  dragenter: true,
  dragleave: true,
  dragover: true,
  drop: true,
} as const satisfies Record<GraphicEventName, true>;

export type GraphicOnEventName = `on${GraphicEventName}`;

type GraphicEventAlias = Exclude<ElementEventAlias, "globalOut">;

export type GraphicEmits = WithOnce<{
  [key in GraphicEventName | GraphicEventAlias]: (params: ElementEvent) => boolean | void;
}>;
