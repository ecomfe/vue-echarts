import { createComponent, type GraphicComponent } from "./component-factory";

export const GGroup: GraphicComponent = createComponent("GGroup", "group");
export const GRect: GraphicComponent = createComponent("GRect", "rect");
export const GCircle: GraphicComponent = createComponent("GCircle", "circle");
export const GText: GraphicComponent = createComponent("GText", "text");
export const GLine: GraphicComponent = createComponent("GLine", "line");
export const GPolyline: GraphicComponent = createComponent("GPolyline", "polyline");
export const GPolygon: GraphicComponent = createComponent("GPolygon", "polygon");
export const GImage: GraphicComponent = createComponent("GImage", "image");
export const GSector: GraphicComponent = createComponent("GSector", "sector");
export const GRing: GraphicComponent = createComponent("GRing", "ring");
export const GArc: GraphicComponent = createComponent("GArc", "arc");
export const GBezierCurve: GraphicComponent = createComponent("GBezierCurve", "bezierCurve");
export const GCompoundPath: GraphicComponent = createComponent("GCompoundPath", "compoundPath");
