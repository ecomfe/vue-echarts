/* eslint-disable @typescript-eslint/no-unused-vars */

import type { AxisBreakChangedEvent } from "echarts/core";

import ECharts from "../../src";

type Props = InstanceType<typeof ECharts>["$props"];

type Assert<T extends true> = T;
type IsEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

type AxisBreakHandler = NonNullable<Props["onAxisbreakchanged"]>;

type _axisBreakPayload = Assert<IsEqual<Parameters<AxisBreakHandler>[0], AxisBreakChangedEvent>>;
type _brushEvent = Assert<"onBrushend" extends keyof Props ? true : false>;

// @ts-expect-error ECharts normalizes public event names to lowercase
type _mixedCaseBrushEvent = Props["onBrushEnd"];
