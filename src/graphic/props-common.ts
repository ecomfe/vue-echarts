import type { ExtractPublicPropTypes, PropType } from "vue";

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
  "progressive",
  "info",
  "focus",
  "blurScope",
  "textContent",
  "textConfig",
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
  "width",
  "overflow",
  "ellipsis",
] as const;

export const IMAGE_STYLE_KEYS = ["image", "x", "y", "width", "height"] as const;

export const STYLE_KEYS_BY_TYPE = {
  text: TEXT_STYLE_KEYS,
  image: IMAGE_STYLE_KEYS,
} as const;

export type GraphicCommonPropKey = (typeof COMMON_PROP_KEYS)[number];
export type GraphicBaseStyleKey = (typeof BASE_STYLE_KEYS)[number];
export type GraphicTextStyleKey = (typeof TEXT_STYLE_KEYS)[number];
export type GraphicImageStyleKey = (typeof IMAGE_STYLE_KEYS)[number];

type GraphicTextStyleOnlyKey = Exclude<GraphicTextStyleKey, "width">;
type GraphicImageStyleOnlyKey = Exclude<GraphicImageStyleKey, "x" | "y" | "width" | "height">;
const ImageElement = typeof HTMLImageElement === "undefined" ? Object : HTMLImageElement;
const CanvasElement = typeof HTMLCanvasElement === "undefined" ? Object : HTMLCanvasElement;
const VideoElement = typeof HTMLVideoElement === "undefined" ? Object : HTMLVideoElement;

const graphicCommonOnlyProps = {
  id: [String, Number] as PropType<string | number>,
  x: Number,
  y: Number,
  rotation: Number,
  scaleX: Number,
  scaleY: Number,
  originX: Number,
  originY: Number,
  left: [String, Number] as PropType<string | number>,
  right: [String, Number] as PropType<string | number>,
  top: [String, Number] as PropType<string | number>,
  bottom: [String, Number] as PropType<string | number>,
  width: [String, Number] as PropType<string | number>,
  height: [String, Number] as PropType<string | number>,
  bounding: String,
  z: Number,
  zlevel: Number,
  silent: Boolean,
  draggable: [Boolean, String] as PropType<boolean | "horizontal" | "vertical">,
  cursor: String,
  ignore: Boolean,
  invisible: Boolean,
  progressive: Number,
  info: null as unknown as PropType<unknown>,
  focus: String,
  blurScope: String,
  textContent: Object as PropType<Record<string, unknown>>,
  textConfig: Object as PropType<Record<string, unknown>>,
  transition: [String, Array] as PropType<string | string[]>,
  enterFrom: Object as PropType<Record<string, unknown>>,
  leaveTo: Object as PropType<Record<string, unknown>>,
  enterAnimation: Object as PropType<Record<string, unknown>>,
  updateAnimation: Object as PropType<Record<string, unknown>>,
  leaveAnimation: Object as PropType<Record<string, unknown>>,
  keyframeAnimation: Object as PropType<Record<string, unknown>>,
} as const satisfies Record<GraphicCommonPropKey, unknown>;

const baseStyleProps = {
  fill: String,
  stroke: String,
  lineWidth: Number,
  lineDash: [String, Array] as PropType<string | number[]>,
  lineDashOffset: Number,
  lineCap: String,
  lineJoin: String,
  miterLimit: Number,
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
  textFill: String,
  textStroke: String,
  textStrokeWidth: Number,
  textAlign: String,
  textVerticalAlign: String,
  textLineHeight: Number,
  textShadowBlur: Number,
  textShadowOffsetX: Number,
  textShadowOffsetY: Number,
  textShadowColor: String,
  overflow: String,
  ellipsis: String,
} as const satisfies Record<GraphicTextStyleOnlyKey, unknown>;

const imageStyleProps = {
  image: [String, ImageElement, CanvasElement, VideoElement] as PropType<
    string | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement
  >,
} as const satisfies Record<GraphicImageStyleOnlyKey, unknown>;

export const commonProps = {
  ...graphicCommonOnlyProps,
  shape: Object as PropType<Record<string, unknown>>,
  style: Object as PropType<Record<string, unknown>>,
  shapeTransition: [String, Array] as PropType<string | string[]>,
  styleTransition: [String, Array] as PropType<string | string[]>,
  ...baseStyleProps,
  ...textStyleProps,
  ...imageStyleProps,
} as const;

export type GraphicCommonProps = ExtractPublicPropTypes<typeof commonProps>;
