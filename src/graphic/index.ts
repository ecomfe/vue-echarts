import { registerGraphicExtension } from "./extension";
import "./slots";

registerGraphicExtension();

export type { VChartSlotsExtension } from "../index";

export {
  GGroup,
  GRect,
  GCircle,
  GText,
  GLine,
  GPolyline,
  GPolygon,
  GImage,
  GSector,
  GRing,
  GArc,
  GBezierCurve,
  GCompoundPath,
} from "./components";
