import type { ExtractPublicPropTypes, PropType } from "vue";

import type { GraphicComponentType } from "./marker";

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

export const shapeProps = {
  x: Number,
  y: Number,
  cx: Number,
  cy: Number,
  r: [Number, Array] as PropType<number | number[]>,
  r0: Number,
  x1: Number,
  y1: Number,
  x2: Number,
  y2: Number,
  cpx1: Number,
  cpy1: Number,
  cpx2: Number,
  cpy2: Number,
  startAngle: Number,
  endAngle: Number,
  percent: Number,
  points: Array as PropType<Array<[number, number]>>,
  smooth: [Boolean, Number] as PropType<boolean | number>,
  smoothConstraint: Array as PropType<Array<[number, number]>>,
  paths: Array as PropType<unknown[]>,
  clockwise: Boolean,
  cornerRadius: [Number, Array] as PropType<number | number[]>,
} as const;

export type GraphicShapeProps = ExtractPublicPropTypes<typeof shapeProps>;
