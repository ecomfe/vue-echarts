/* eslint-disable @typescript-eslint/no-unused-vars */

import type { Color, TooltipComponentOption } from "echarts";

import { GImage, GRect, GText } from "../../src/graphic/components";

type ImageProps = InstanceType<typeof GImage>["$props"];
type RectProps = InstanceType<typeof GRect>["$props"];
type TextProps = InstanceType<typeof GText>["$props"];

type Assert<T extends true> = T;
type IsAssignable<From, To> = [From] extends [To] ? true : false;

type _progressiveType = Assert<IsAssignable<RectProps["progressive"], number | undefined>>;
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
type _fillAcceptsEChartsColor = Assert<IsAssignable<Color, RectProps["fill"]>>;
type _strokeAcceptsEChartsColor = Assert<IsAssignable<Color, RectProps["stroke"]>>;
type _lineDashAcceptsDisabled = Assert<IsAssignable<false, RectProps["lineDash"]>>;
type _strokeNoScaleAcceptsFalse = Assert<IsAssignable<false, RectProps["strokeNoScale"]>>;
type _fillOpacityType = Assert<IsAssignable<RectProps["fillOpacity"], number | undefined>>;
type _strokeOpacityType = Assert<IsAssignable<RectProps["strokeOpacity"], number | undefined>>;
type _sxType = Assert<IsAssignable<ImageProps["sx"], number | undefined>>;
type _syType = Assert<IsAssignable<ImageProps["sy"], number | undefined>>;
type _sWidthType = Assert<IsAssignable<ImageProps["sWidth"], number | undefined>>;
type _sHeightType = Assert<IsAssignable<ImageProps["sHeight"], number | undefined>>;
type _overflowType = Assert<IsAssignable<TextProps["overflow"], string | undefined>>;
type _ellipsisType = Assert<IsAssignable<TextProps["ellipsis"], string | undefined>>;
