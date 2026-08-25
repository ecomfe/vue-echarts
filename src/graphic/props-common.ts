import type { ExtractPublicPropTypes, PropType } from "vue";
import type {
  Color,
  CustomSeriesRenderItemReturn,
  PatternObject,
  TooltipComponentOption,
} from "echarts";
import type { FontStyle, FontWeight } from "../types";

export type GraphicDuring = NonNullable<NonNullable<CustomSeriesRenderItemReturn>["during"]>;
type GraphicExtra = Record<string, unknown> & {
  transition?: string | string[];
};

export const COMMON_PROP_KEYS = [
  "id",
  "name",
  "x",
  "y",
  "rotation",
  "scaleX",
  "scaleY",
  "skewX",
  "skewY",
  "originX",
  "originY",
  "anchorX",
  "anchorY",
  "left",
  "right",
  "top",
  "bottom",
  "width",
  "height",
  "bounding",
  "z",
  "z2",
  "zlevel",
  "silent",
  "draggable",
  "cursor",
  "ignore",
  "invisible",
  "extra",
  "info",
  "tooltip",
  "clipPath",
  "textContent",
  "textConfig",
  "transition",
  "enterFrom",
  "leaveTo",
  "during",
  "enterAnimation",
  "updateAnimation",
  "leaveAnimation",
  "keyframeAnimation",
] as const;

export const BASE_STYLE_KEYS = [
  "fill",
  "stroke",
  "decal",
  "strokePercent",
  "strokeNoScale",
  "fillOpacity",
  "strokeOpacity",
  "lineWidth",
  "lineDash",
  "lineDashOffset",
  "lineCap",
  "lineJoin",
  "miterLimit",
  "strokeFirst",
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
  "textFont",
  "fontStyle",
  "fontWeight",
  "fontFamily",
  "fontSize",
  "align",
  "verticalAlign",
  "lineHeight",
  "backgroundColor",
  "padding",
  "margin",
  "borderColor",
  "borderWidth",
  "borderRadius",
  "borderDash",
  "borderDashOffset",
  "rich",
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
  "width",
  "height",
  "overflow",
  "lineOverflow",
  "ellipsis",
  "placeholder",
  "truncateMinChar",
] as const;

export const IMAGE_STYLE_KEYS = [
  "image",
  "x",
  "y",
  "width",
  "height",
  "sx",
  "sy",
  "sWidth",
  "sHeight",
] as const;

export const STYLE_KEYS_BY_TYPE = {
  text: TEXT_STYLE_KEYS,
  image: IMAGE_STYLE_KEYS,
} as const;

export type GraphicCommonPropKey = (typeof COMMON_PROP_KEYS)[number];
export type GraphicBaseStyleKey = (typeof BASE_STYLE_KEYS)[number];
export type GraphicTextStyleKey = (typeof TEXT_STYLE_KEYS)[number];
export type GraphicImageStyleKey = (typeof IMAGE_STYLE_KEYS)[number];

// Keep zrender defaults instead of letting Vue cast absent Boolean props to false.
export function withUndefinedDefault<T>(type: T) {
  return { type, default: undefined };
}

type GraphicTextStyleOnlyKey = Exclude<GraphicTextStyleKey, "width" | "height">;
type GraphicImageStyleOnlyKey = Exclude<GraphicImageStyleKey, "x" | "y" | "width" | "height">;
type GraphicImageSource = string | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement;
type GraphicTextAlign = "left" | "center" | "right";
type GraphicTextVerticalAlign = "top" | "middle" | "bottom";
type GraphicTextOverflow = "break" | "breakAll" | "truncate" | "none";

const graphicCommonOnlyProps = {
  id: [String, Number] as PropType<string | number>,
  name: String,
  x: Number,
  y: Number,
  rotation: Number,
  scaleX: Number,
  scaleY: Number,
  skewX: Number,
  skewY: Number,
  originX: Number,
  originY: Number,
  anchorX: Number,
  anchorY: Number,
  left: [String, Number] as PropType<string | number>,
  right: [String, Number] as PropType<string | number>,
  top: [String, Number] as PropType<string | number>,
  bottom: [String, Number] as PropType<string | number>,
  width: [String, Number] as PropType<string | number>,
  height: [String, Number] as PropType<string | number>,
  bounding: String as PropType<"raw" | "all">,
  z: Number,
  z2: Number,
  zlevel: Number,
  silent: withUndefinedDefault(Boolean),
  draggable: withUndefinedDefault([Boolean, String] as PropType<
    boolean | "horizontal" | "vertical"
  >),
  cursor: String,
  ignore: withUndefinedDefault(Boolean),
  invisible: withUndefinedDefault(Boolean),
  extra: Object as PropType<GraphicExtra>,
  info: null as unknown as PropType<unknown>,
  tooltip: Object as PropType<TooltipComponentOption>,
  clipPath: withUndefinedDefault([Boolean, Object] as PropType<false | object>),
  textContent: Object as PropType<Record<string, unknown>>,
  textConfig: Object as PropType<object>,
  transition: [String, Array] as PropType<string | string[]>,
  enterFrom: Object as PropType<object>,
  leaveTo: Object as PropType<object>,
  during: Function as PropType<GraphicDuring>,
  enterAnimation: Object as PropType<object>,
  updateAnimation: Object as PropType<object>,
  leaveAnimation: Object as PropType<object>,
  keyframeAnimation: [Object, Array] as PropType<object>,
} as const satisfies Record<GraphicCommonPropKey, unknown>;

const baseStyleProps = {
  fill: [String, Object] as PropType<Color>,
  stroke: [String, Object] as PropType<Color>,
  decal: Object as PropType<PatternObject>,
  strokePercent: Number,
  strokeNoScale: withUndefinedDefault(Boolean),
  fillOpacity: Number,
  strokeOpacity: Number,
  lineWidth: Number,
  lineDash: withUndefinedDefault([String, Array, Boolean] as PropType<
    "solid" | "dashed" | "dotted" | number[] | false
  >),
  lineDashOffset: Number,
  lineCap: String as PropType<CanvasLineCap>,
  lineJoin: String as PropType<CanvasLineJoin>,
  miterLimit: Number,
  strokeFirst: withUndefinedDefault(Boolean),
  shadowBlur: Number,
  shadowOffsetX: Number,
  shadowOffsetY: Number,
  shadowColor: String,
  opacity: Number,
  blend: String,
} as const satisfies Record<GraphicBaseStyleKey, unknown>;

const textStyleProps = {
  text: String,
  font: String,
  textFont: String,
  fontStyle: String as PropType<FontStyle>,
  fontWeight: [String, Number] as PropType<FontWeight>,
  fontFamily: String,
  fontSize: [String, Number] as PropType<string | number>,
  align: String as PropType<GraphicTextAlign>,
  verticalAlign: String as PropType<GraphicTextVerticalAlign>,
  lineHeight: Number,
  backgroundColor: [String, Object] as PropType<string | { image: GraphicImageSource }>,
  padding: [Number, Array] as PropType<number | number[]>,
  margin: [Number, Array] as PropType<number | number[]>,
  borderColor: String,
  borderWidth: Number,
  borderRadius: [Number, Array] as PropType<number | number[]>,
  borderDash: withUndefinedDefault([Array, Boolean] as PropType<number[] | false>),
  borderDashOffset: Number,
  rich: Object as PropType<Record<string, object>>,
  textFill: String,
  textStroke: String,
  textStrokeWidth: Number,
  textAlign: String as PropType<GraphicTextAlign>,
  textVerticalAlign: String as PropType<GraphicTextVerticalAlign>,
  textLineHeight: Number,
  textShadowBlur: Number,
  textShadowOffsetX: Number,
  textShadowOffsetY: Number,
  textShadowColor: String,
  overflow: String as PropType<GraphicTextOverflow>,
  lineOverflow: String as PropType<"truncate">,
  ellipsis: String,
  placeholder: String,
  truncateMinChar: Number,
} as const satisfies Record<GraphicTextStyleOnlyKey, unknown>;

const imageStyleProps = {
  image: [String, Object] as PropType<GraphicImageSource>,
  sx: Number,
  sy: Number,
  sWidth: Number,
  sHeight: Number,
} as const satisfies Record<GraphicImageStyleOnlyKey, unknown>;

export const commonProps = {
  ...graphicCommonOnlyProps,
  shape: Object as PropType<Record<string, unknown>>,
  style: Object as PropType<object>,
  shapeTransition: [String, Array] as PropType<string | string[]>,
  styleTransition: [String, Array] as PropType<string | string[]>,
  ...baseStyleProps,
  ...textStyleProps,
  ...imageStyleProps,
} as const;

export type GraphicCommonProps = ExtractPublicPropTypes<typeof commonProps>;
