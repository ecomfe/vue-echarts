import { createComponent, type GraphicComponent } from "./component-factory";

export const GGroup: GraphicComponent<"group"> = createComponent("GGroup", "group");
export const GRect: GraphicComponent<"rect"> = createComponent("GRect", "rect");
export const GCircle: GraphicComponent<"circle"> = createComponent("GCircle", "circle");
export const GEllipse: GraphicComponent<"ellipse"> = createComponent("GEllipse", "ellipse");
export const GText: GraphicComponent<"text"> = createComponent("GText", "text");
export const GLine: GraphicComponent<"line"> = createComponent("GLine", "line");
export const GPolyline: GraphicComponent<"polyline"> = createComponent("GPolyline", "polyline");
export const GPolygon: GraphicComponent<"polygon"> = createComponent("GPolygon", "polygon");
export const GImage: GraphicComponent<"image"> = createComponent("GImage", "image");
export const GSector: GraphicComponent<"sector"> = createComponent("GSector", "sector");
export const GRing: GraphicComponent<"ring"> = createComponent("GRing", "ring");
export const GArc: GraphicComponent<"arc"> = createComponent("GArc", "arc");
export const GBezierCurve: GraphicComponent<"bezierCurve"> = createComponent(
  "GBezierCurve",
  "bezierCurve",
);
