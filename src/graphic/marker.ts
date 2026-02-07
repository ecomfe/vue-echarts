export const GRAPHIC_COMPONENT_MARKER = Symbol("vue-echarts:graphic-component");

export type GraphicComponentType =
  | "group"
  | "rect"
  | "circle"
  | "text"
  | "line"
  | "polyline"
  | "polygon"
  | "image"
  | "sector"
  | "ring"
  | "arc"
  | "bezierCurve"
  | "compoundPath";
