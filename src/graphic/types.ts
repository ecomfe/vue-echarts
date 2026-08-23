import type { ElementEvent } from "echarts/core";

export type GraphicEventName = Exclude<ElementEvent["type"], "globalout">;
export type GraphicOnEventName = `on${GraphicEventName}`;

export type GraphicEmits = {
  [key in GraphicEventName]: (params: ElementEvent) => void;
};
