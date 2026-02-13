import type { ElementEvent } from "echarts/core";
import type { ElementEventName } from "../types";

export type GraphicEventName = Exclude<ElementEventName, "globalout">;
export type GraphicOnEventName = `on${GraphicEventName}`;

export type GraphicEmits = {
  [key in GraphicEventName]: (params: ElementEvent) => void;
};
