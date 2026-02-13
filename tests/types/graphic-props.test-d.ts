/* eslint-disable @typescript-eslint/no-unused-vars */

import { GRect, GText } from "../../src/graphic/components";

type RectProps = InstanceType<typeof GRect>["$props"];
type TextProps = InstanceType<typeof GText>["$props"];

type Assert<T extends true> = T;
type IsAssignable<From, To> = [From] extends [To] ? true : false;

type _progressiveType = Assert<IsAssignable<RectProps["progressive"], number | undefined>>;
type _textContentType = Assert<IsAssignable<RectProps["textContent"], object | undefined>>;
type _textConfigType = Assert<IsAssignable<RectProps["textConfig"], object | undefined>>;
type _overflowType = Assert<IsAssignable<TextProps["overflow"], string | undefined>>;
type _ellipsisType = Assert<IsAssignable<TextProps["ellipsis"], string | undefined>>;
