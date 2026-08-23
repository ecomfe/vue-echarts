import type { ElementEvent } from "echarts/core";

export type GraphicEventName = Exclude<ElementEvent["type"], "globalout">;
export type GraphicOnEventName = `on${GraphicEventName}`;

// Vue only capitalizes the first letter; attrs also accept these idiomatic aliases.
type CamelCaseGraphicEventName =
  | "dblClick"
  | "contextMenu"
  | `mouse${Capitalize<"wheel" | "out" | "over" | "up" | "down" | "move">}`
  | `drag${Capitalize<"start" | "end" | "enter" | "leave" | "over">}`;

export type GraphicEmits = {
  [key in GraphicEventName | CamelCaseGraphicEventName]: (params: ElementEvent) => void;
};
