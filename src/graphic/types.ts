import type { ElementEvent } from "echarts/core";
import type { ElementEventAlias } from "../types";

export type GraphicEventName = Exclude<ElementEvent["type"], "globalout">;
export type GraphicOnEventName = `on${GraphicEventName}`;

type GraphicEventAlias = Exclude<ElementEventAlias, "globalOut">;

export type GraphicEmits = {
  [key in GraphicEventName | GraphicEventAlias]: (params: ElementEvent) => void;
};
