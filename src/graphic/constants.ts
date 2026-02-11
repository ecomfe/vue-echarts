import type { GraphicComponentType } from "./marker";

export const GRAPHIC_INFO_ID_KEY = "__veGraphicId";

export const COMMON_PROP_KEYS = [
  "id",
  "x",
  "y",
  "rotation",
  "scaleX",
  "scaleY",
  "originX",
  "originY",
  "left",
  "right",
  "top",
  "bottom",
  "width",
  "height",
  "bounding",
  "z",
  "zlevel",
  "silent",
  "draggable",
  "cursor",
  "ignore",
  "invisible",
  "info",
  "focus",
  "blurScope",
  "transition",
  "enterFrom",
  "leaveTo",
  "enterAnimation",
  "updateAnimation",
  "leaveAnimation",
  "keyframeAnimation",
] as const;

export const BASE_STYLE_KEYS = [
  "fill",
  "stroke",
  "lineWidth",
  "lineDash",
  "lineDashOffset",
  "lineCap",
  "lineJoin",
  "miterLimit",
  "shadowBlur",
  "shadowOffsetX",
  "shadowOffsetY",
  "shadowColor",
  "opacity",
  "blend",
] as const;

export const TEXT_STYLE_KEYS = [
  "text",
  "font",
  "textFill",
  "textStroke",
  "textStrokeWidth",
  "textAlign",
  "textVerticalAlign",
  "textLineHeight",
  "textShadowBlur",
  "textShadowOffsetX",
  "textShadowOffsetY",
  "textShadowColor",
] as const;

export const IMAGE_STYLE_KEYS = ["image", "x", "y", "width", "height"] as const;

export const SHAPE_KEYS_BY_TYPE = {
  rect: ["x", "y", "width", "height", "r"],
  circle: ["cx", "cy", "r"],
  sector: ["cx", "cy", "r", "r0", "startAngle", "endAngle", "clockwise", "cornerRadius"],
  ring: ["cx", "cy", "r", "r0"],
  arc: ["cx", "cy", "r", "r0", "startAngle", "endAngle", "clockwise"],
  line: ["x1", "y1", "x2", "y2", "percent"],
  polyline: ["points", "smooth", "smoothConstraint"],
  polygon: ["points", "smooth", "smoothConstraint"],
  bezierCurve: ["x1", "y1", "x2", "y2", "cpx1", "cpy1", "cpx2", "cpy2", "percent"],
  compoundPath: ["paths"],
} as const satisfies Partial<Record<GraphicComponentType, readonly string[]>>;
