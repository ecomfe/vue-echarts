import { registerExtension } from "./extension";

registerExtension();

export type { VChartSlotsExtension } from "../index";
export type { GraphicEmits, GraphicEventName, GraphicOnEventName } from "./types";
export type { GraphicCommonProps } from "./props-common";
export type { GraphicShapeProps } from "./props-shape";

export {
  GGroup,
  GRect,
  GCircle,
  GEllipse,
  GText,
  GLine,
  GPolyline,
  GPolygon,
  GImage,
  GSector,
  GRing,
  GArc,
  GBezierCurve,
} from "./components";
