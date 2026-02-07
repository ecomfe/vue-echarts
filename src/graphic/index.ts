import { registerGraphicExtension } from "./extension";
import "./slots";

registerGraphicExtension();

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
