/* eslint-disable @typescript-eslint/no-unused-vars */

import type {
  Color,
  CustomSeriesRenderItemReturn,
  GraphicComponentOption,
  PatternObject,
} from "echarts";

import {
  GArc,
  GCircle,
  GEllipse,
  GGroup,
  GImage,
  GPolyline,
  GRect,
  GRing,
  GSector,
  GText,
} from "../../src/graphic/components";
import type { GraphicCommonProps } from "../../src/graphic";

type GroupProps = InstanceType<typeof GGroup>["$props"];
type ImageProps = InstanceType<typeof GImage>["$props"];
type CircleProps = InstanceType<typeof GCircle>["$props"];
type SectorProps = InstanceType<typeof GSector>["$props"];
type RingProps = InstanceType<typeof GRing>["$props"];
type ArcProps = InstanceType<typeof GArc>["$props"];
type EllipseProps = InstanceType<typeof GEllipse>["$props"];
type PolylineProps = InstanceType<typeof GPolyline>["$props"];
type RectProps = InstanceType<typeof GRect>["$props"];
type TextProps = InstanceType<typeof GText>["$props"];

type Assert<T extends true> = T;
type IsAssignable<From, To> = [From] extends [To] ? true : false;
type IsEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type OptionProp<T, K extends PropertyKey> = T extends { [P in K]?: infer V } ? V : never;
type GraphicOptionProp<K extends PropertyKey> = NonNullable<OptionProp<GraphicComponentOption, K>>;
type Every<T> = [T] extends [true] ? true : false;
type PropsMatch<Actual, Expected> = Every<
  {
    [K in keyof Expected]: K extends keyof Actual ? IsEqual<Actual[K], Expected[K]> : false;
  }[keyof Expected]
>;
type PropsAccept<Actual, Expected> = Every<
  {
    [K in keyof Expected]: K extends keyof Actual ? IsAssignable<Expected[K], Actual[K]> : false;
  }[keyof Expected]
>;
type KeysOf<T> = T extends unknown ? keyof T : never;
type Rejects<Actual, Keys extends PropertyKey> = IsEqual<Extract<Keys, KeysOf<Actual>>, never>;

type _unsupportedProps = Assert<Rejects<RectProps, "progressive" | "focus" | "blurScope">>;
type _groupRejectsElementProps = Assert<
  Rejects<
    GroupProps,
    "fill" | "text" | "image" | "cx" | "z" | "z2" | "zlevel" | "cursor" | "invisible"
  >
>;
type _rectRejectsForeignProps = Assert<Rejects<RectProps, "cx" | "points" | "text" | "image">>;
type _circleRejectsForeignProps = Assert<Rejects<CircleProps, "x1" | "points" | "text" | "image">>;
type _textRejectsForeignProps = Assert<
  Rejects<
    TextProps,
    | "cx"
    | "points"
    | "image"
    | "sx"
    | "decal"
    | "strokePercent"
    | "lineCap"
    | "blend"
    | "textFill"
    | "textStroke"
    | "textContent"
    | "textConfig"
  >
>;
type _imageRejectsForeignProps = Assert<
  Rejects<ImageProps, "cx" | "points" | "text" | "overflow" | "fill" | "lineWidth" | "lineDash">
>;
type _nonPathRejectsShape = Assert<
  Rejects<GroupProps | TextProps | ImageProps, "shape" | "shapeTransition">
>;
type _groupRejectsStyleTransition = Assert<Rejects<GroupProps, "styleTransition">>;
type _nonPathRejectsAutoBatch = Assert<Rejects<GroupProps | TextProps | ImageProps, "autoBatch">>;

type _rectExactProps = Assert<
  PropsMatch<
    RectProps,
    {
      bounding: "raw" | "all" | undefined;
      enterAnimation: GraphicOptionProp<"enterAnimation"> | undefined;
      updateAnimation: GraphicOptionProp<"updateAnimation"> | undefined;
      leaveAnimation: GraphicOptionProp<"leaveAnimation"> | undefined;
      keyframeAnimation: GraphicOptionProp<"keyframeAnimation"> | undefined;
    }
  >
>;
type _rectAcceptsEChartsProps = Assert<
  PropsAccept<
    RectProps,
    {
      during: NonNullable<NonNullable<CustomSeriesRenderItemReturn>["during"]>;
      extra: NonNullable<NonNullable<CustomSeriesRenderItemReturn>["extra"]>;
      tooltip: GraphicOptionProp<"tooltip">;
      clipPath: GraphicOptionProp<"clipPath">;
    }
  >
>;

type NumericDimensionProps = GroupProps | ImageProps | RectProps;
type _numericWidthType = Assert<IsEqual<NumericDimensionProps["width"], number | undefined>>;
type _textWidthType = Assert<IsEqual<TextProps["width"], string | number | undefined>>;
type _commonWidthType = Assert<IsEqual<GraphicCommonProps["width"], string | number | undefined>>;
type _heightType = Assert<
  IsEqual<(NumericDimensionProps | TextProps)["height"], number | undefined>
>;
type _otherShapesRejectDimensions = Assert<
  IsEqual<
    Extract<"width" | "height", keyof CircleProps | keyof EllipseProps | keyof PolylineProps>,
    never
  >
>;
type _rectRadiusType = Assert<IsEqual<RectProps["r"], number | number[] | undefined>>;
type ScalarRadiusProps = CircleProps | SectorProps | RingProps | ArcProps;
type _scalarRadiusType = Assert<IsEqual<ScalarRadiusProps["r"], number | undefined>>;

type _pathExactProps = Assert<
  PropsMatch<
    RectProps,
    {
      autoBatch: boolean | undefined;
      strokeFirst: boolean | undefined;
      strokeNoScale: boolean | undefined;
      lineDash: false | number[] | "solid" | "dashed" | "dotted" | undefined;
      lineCap: CanvasLineCap | undefined;
      lineJoin: CanvasLineJoin | undefined;
    }
  >
>;
type _pathAcceptsPaint = Assert<
  PropsAccept<RectProps, { fill: Color; stroke: Color; decal: PatternObject }>
>;

type _smoothType = Assert<PropsMatch<PolylineProps, { smooth: number | undefined }>>;
type _shapePropsAcceptVectors = Assert<
  PropsAccept<PolylineProps, { points: number[][]; smoothConstraint: number[][] }>
>;

type _textExactProps = Assert<
  PropsMatch<
    TextProps,
    {
      fill: string | undefined;
      stroke: string | undefined;
      lineDash: false | number[] | undefined;
      fontStyle: "normal" | "italic" | "oblique" | undefined;
      fontWeight: "normal" | "bold" | "bolder" | "lighter" | number | undefined;
      align: "left" | "center" | "right" | undefined;
      verticalAlign: "top" | "middle" | "bottom" | undefined;
      textAlign: TextProps["align"];
      textVerticalAlign: TextProps["verticalAlign"];
      overflow: "break" | "breakAll" | "truncate" | "none" | undefined;
      lineOverflow: "truncate" | undefined;
      margin: number | number[] | undefined;
      borderDash: false | number[] | undefined;
    }
  >
>;
type _textAcceptsRichStyles = Assert<
  PropsAccept<
    TextProps,
    {
      fontSize: string;
      backgroundColor: { image: string };
      padding: number[];
      borderRadius: number[];
      rich: Record<string, object>;
    }
  >
>;
