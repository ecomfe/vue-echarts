/* eslint-disable @typescript-eslint/no-unused-vars */

import type {
  Color,
  CustomSeriesRenderItemReturn,
  GraphicComponentOption,
  PatternObject,
  TooltipComponentOption,
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

type _unsupportedProps = Assert<
  IsAssignable<Extract<"progressive" | "focus" | "blurScope", keyof RectProps>, never>
>;
type _groupRejectsElementProps = Assert<
  IsEqual<Extract<"fill" | "text" | "image" | "cx", keyof GroupProps>, never>
>;
type _rectRejectsForeignProps = Assert<
  IsEqual<Extract<"cx" | "points" | "text" | "image", keyof RectProps>, never>
>;
type _circleRejectsForeignProps = Assert<
  IsEqual<Extract<"x1" | "points" | "text" | "image", keyof CircleProps>, never>
>;
type _textRejectsForeignProps = Assert<
  IsEqual<
    Extract<
      "cx" | "points" | "image" | "sx" | "decal" | "strokePercent" | "lineCap",
      keyof TextProps
    >,
    never
  >
>;
type _imageRejectsForeignProps = Assert<
  IsEqual<
    Extract<
      "cx" | "points" | "text" | "overflow" | "fill" | "lineWidth" | "lineDash",
      keyof ImageProps
    >,
    never
  >
>;
type _nonPathRejectsShape = Assert<
  IsEqual<
    Extract<"shape" | "shapeTransition", keyof GroupProps | keyof TextProps | keyof ImageProps>,
    never
  >
>;
type _groupRejectsStyleTransition = Assert<
  IsEqual<Extract<"styleTransition", keyof GroupProps>, never>
>;
type _nonPathRejectsAutoBatch = Assert<
  IsEqual<Extract<"autoBatch", keyof GroupProps | keyof TextProps | keyof ImageProps>, never>
>;
type _duringType = Assert<
  IsAssignable<
    NonNullable<NonNullable<CustomSeriesRenderItemReturn>["during"]>,
    RectProps["during"]
  >
>;
type _extraType = Assert<
  IsAssignable<NonNullable<NonNullable<CustomSeriesRenderItemReturn>["extra"]>, RectProps["extra"]>
>;
type _nameType = Assert<IsAssignable<RectProps["name"], string | undefined>>;
type _boundingType = Assert<IsEqual<RectProps["bounding"], "raw" | "all" | undefined>>;
type _tooltipAcceptsEChartsOption = Assert<
  IsAssignable<TooltipComponentOption, RectProps["tooltip"]>
>;
type _clipPathAcceptsObject = Assert<IsAssignable<object, RectProps["clipPath"]>>;
type _clipPathAcceptsFalse = Assert<IsAssignable<false, RectProps["clipPath"]>>;
type _z2Type = Assert<IsAssignable<RectProps["z2"], number | undefined>>;
type DimensionProps = GroupProps | ImageProps | RectProps | TextProps;
type _widthType = Assert<IsEqual<DimensionProps["width"], number | undefined>>;
type _heightType = Assert<IsEqual<DimensionProps["height"], number | undefined>>;
type _otherShapesRejectDimensions = Assert<
  IsEqual<
    Extract<"width" | "height", keyof CircleProps | keyof EllipseProps | keyof PolylineProps>,
    never
  >
>;
type _rectRadiusType = Assert<IsEqual<RectProps["r"], number | number[] | undefined>>;
type ScalarRadiusProps = CircleProps | SectorProps | RingProps | ArcProps;
type _scalarRadiusType = Assert<IsEqual<ScalarRadiusProps["r"], number | undefined>>;
type _skewXType = Assert<IsAssignable<RectProps["skewX"], number | undefined>>;
type _skewYType = Assert<IsAssignable<RectProps["skewY"], number | undefined>>;
type _anchorXType = Assert<IsAssignable<RectProps["anchorX"], number | undefined>>;
type _anchorYType = Assert<IsAssignable<RectProps["anchorY"], number | undefined>>;
type _textContentType = Assert<IsAssignable<RectProps["textContent"], object | undefined>>;
type _textConfigType = Assert<IsAssignable<RectProps["textConfig"], object | undefined>>;
type _styleAcceptsEChartsOption = Assert<
  IsAssignable<GraphicOptionProp<"style">, RectProps["style"]>
>;
type _textConfigAcceptsEChartsOption = Assert<
  IsAssignable<GraphicOptionProp<"textConfig">, RectProps["textConfig"]>
>;
type _enterFromAcceptsEChartsOption = Assert<
  IsAssignable<GraphicOptionProp<"enterFrom">, RectProps["enterFrom"]>
>;
type _leaveToAcceptsEChartsOption = Assert<
  IsAssignable<GraphicOptionProp<"leaveTo">, RectProps["leaveTo"]>
>;
type _enterAnimationAcceptsEChartsOption = Assert<
  IsAssignable<GraphicOptionProp<"enterAnimation">, RectProps["enterAnimation"]>
>;
type _updateAnimationAcceptsEChartsOption = Assert<
  IsAssignable<GraphicOptionProp<"updateAnimation">, RectProps["updateAnimation"]>
>;
type _leaveAnimationAcceptsEChartsOption = Assert<
  IsAssignable<GraphicOptionProp<"leaveAnimation">, RectProps["leaveAnimation"]>
>;
type _fillAcceptsEChartsColor = Assert<IsAssignable<Color, RectProps["fill"]>>;
type _strokeAcceptsEChartsColor = Assert<IsAssignable<Color, RectProps["stroke"]>>;
type _decalAcceptsPattern = Assert<IsAssignable<PatternObject, RectProps["decal"]>>;
type _strokePercentType = Assert<IsAssignable<RectProps["strokePercent"], number | undefined>>;
type _autoBatchType = Assert<IsEqual<RectProps["autoBatch"], boolean | undefined>>;
type _strokeFirstAcceptsFalse = Assert<IsAssignable<false, RectProps["strokeFirst"]>>;
type _lineDashAcceptsDisabled = Assert<IsAssignable<false, RectProps["lineDash"]>>;
type _lineDashType = Assert<
  IsEqual<RectProps["lineDash"], false | number[] | "solid" | "dashed" | "dotted" | undefined>
>;
type _lineCapType = Assert<IsEqual<RectProps["lineCap"], CanvasLineCap | undefined>>;
type _lineJoinType = Assert<IsEqual<RectProps["lineJoin"], CanvasLineJoin | undefined>>;
type _strokeNoScaleAcceptsFalse = Assert<IsAssignable<false, RectProps["strokeNoScale"]>>;
type _fillOpacityType = Assert<IsAssignable<RectProps["fillOpacity"], number | undefined>>;
type _strokeOpacityType = Assert<IsAssignable<RectProps["strokeOpacity"], number | undefined>>;
type _sxType = Assert<IsAssignable<ImageProps["sx"], number | undefined>>;
type _syType = Assert<IsAssignable<ImageProps["sy"], number | undefined>>;
type _sWidthType = Assert<IsAssignable<ImageProps["sWidth"], number | undefined>>;
type _sHeightType = Assert<IsAssignable<ImageProps["sHeight"], number | undefined>>;
type _pointsAcceptVectors = Assert<IsAssignable<number[][], PolylineProps["points"]>>;
type _smoothConstraintAcceptsVectors = Assert<
  IsAssignable<number[][], PolylineProps["smoothConstraint"]>
>;
type _rxType = Assert<IsAssignable<EllipseProps["rx"], number | undefined>>;
type _ryType = Assert<IsAssignable<EllipseProps["ry"], number | undefined>>;
type _fontWeightAcceptsNumber = Assert<IsAssignable<number, TextProps["fontWeight"]>>;
type _textFontType = Assert<IsEqual<TextProps["textFont"], string | undefined>>;
type _fontStyleType = Assert<
  IsEqual<TextProps["fontStyle"], "normal" | "italic" | "oblique" | undefined>
>;
type _fontWeightType = Assert<
  IsEqual<TextProps["fontWeight"], "normal" | "bold" | "bolder" | "lighter" | number | undefined>
>;
type _fontSizeAcceptsString = Assert<IsAssignable<string, TextProps["fontSize"]>>;
type _alignType = Assert<IsEqual<TextProps["align"], "left" | "center" | "right" | undefined>>;
type _verticalAlignType = Assert<
  IsEqual<TextProps["verticalAlign"], "top" | "middle" | "bottom" | undefined>
>;
type _legacyAlignType = Assert<IsEqual<TextProps["textAlign"], TextProps["align"]>>;
type _legacyVerticalAlignType = Assert<
  IsEqual<TextProps["textVerticalAlign"], TextProps["verticalAlign"]>
>;
type _overflowType = Assert<
  IsEqual<TextProps["overflow"], "break" | "breakAll" | "truncate" | "none" | undefined>
>;
type _lineOverflowType = Assert<IsEqual<TextProps["lineOverflow"], "truncate" | undefined>>;
type _ellipsisType = Assert<IsAssignable<TextProps["ellipsis"], string | undefined>>;
type _placeholderType = Assert<IsAssignable<TextProps["placeholder"], string | undefined>>;
type _truncateMinCharType = Assert<IsAssignable<TextProps["truncateMinChar"], number | undefined>>;
type _backgroundAcceptsImage = Assert<
  IsAssignable<{ image: string }, TextProps["backgroundColor"]>
>;
type _paddingAcceptsBox = Assert<IsAssignable<number[], TextProps["padding"]>>;
type _marginType = Assert<IsAssignable<TextProps["margin"], number | number[] | undefined>>;
type _borderRadiusAcceptsBox = Assert<IsAssignable<number[], TextProps["borderRadius"]>>;
type _borderDashAcceptsDisabled = Assert<IsAssignable<false, TextProps["borderDash"]>>;
type _richAcceptsTextStyles = Assert<IsAssignable<Record<string, object>, TextProps["rich"]>>;
