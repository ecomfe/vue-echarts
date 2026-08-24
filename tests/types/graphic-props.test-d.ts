/* eslint-disable @typescript-eslint/no-unused-vars */

import type {
  Color,
  CustomSeriesRenderItemReturn,
  GraphicComponentOption,
  PatternObject,
  TooltipComponentOption,
} from "echarts";

import { GEllipse, GImage, GPolyline, GRect, GText } from "../../src/graphic/components";

type ImageProps = InstanceType<typeof GImage>["$props"];
type EllipseProps = InstanceType<typeof GEllipse>["$props"];
type PolylineProps = InstanceType<typeof GPolyline>["$props"];
type RectProps = InstanceType<typeof GRect>["$props"];
type TextProps = InstanceType<typeof GText>["$props"];

type Assert<T extends true> = T;
type IsAssignable<From, To> = [From] extends [To] ? true : false;
type OptionProp<T, K extends PropertyKey> = T extends { [P in K]?: infer V } ? V : never;
type GraphicOptionProp<K extends PropertyKey> = NonNullable<OptionProp<GraphicComponentOption, K>>;

type _unsupportedProps = Assert<
  IsAssignable<Extract<"progressive" | "focus" | "blurScope", keyof RectProps>, never>
>;
type _duringType = Assert<
  IsAssignable<
    NonNullable<NonNullable<CustomSeriesRenderItemReturn>["during"]>,
    RectProps["during"]
  >
>;
type _nameType = Assert<IsAssignable<RectProps["name"], string | undefined>>;
type _tooltipAcceptsEChartsOption = Assert<
  IsAssignable<TooltipComponentOption, RectProps["tooltip"]>
>;
type _clipPathAcceptsObject = Assert<IsAssignable<object, RectProps["clipPath"]>>;
type _clipPathAcceptsFalse = Assert<IsAssignable<false, RectProps["clipPath"]>>;
type _z2Type = Assert<IsAssignable<RectProps["z2"], number | undefined>>;
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
type _strokeFirstAcceptsFalse = Assert<IsAssignable<false, RectProps["strokeFirst"]>>;
type _lineDashAcceptsDisabled = Assert<IsAssignable<false, RectProps["lineDash"]>>;
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
type _fontSizeAcceptsString = Assert<IsAssignable<string, TextProps["fontSize"]>>;
type _overflowType = Assert<IsAssignable<TextProps["overflow"], string | undefined>>;
type _lineOverflowType = Assert<IsAssignable<TextProps["lineOverflow"], string | undefined>>;
type _ellipsisType = Assert<IsAssignable<TextProps["ellipsis"], string | undefined>>;
type _backgroundAcceptsImage = Assert<
  IsAssignable<{ image: string }, TextProps["backgroundColor"]>
>;
type _paddingAcceptsBox = Assert<IsAssignable<number[], TextProps["padding"]>>;
type _marginType = Assert<IsAssignable<TextProps["margin"], number | number[] | undefined>>;
type _borderRadiusAcceptsBox = Assert<IsAssignable<number[], TextProps["borderRadius"]>>;
type _borderDashAcceptsDisabled = Assert<IsAssignable<false, TextProps["borderDash"]>>;
type _richAcceptsTextStyles = Assert<IsAssignable<Record<string, object>, TextProps["rich"]>>;
