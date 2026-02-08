import { beforeEach } from "vitest";
import type { ChartStub } from "./mock";
import { enqueueChart, resetECharts } from "./mock";
import { __resetGraphicRuntime } from "../../src/graphic/runtime";

export function setupGraphicSlotSuite() {
  let chartStub: ChartStub;

  beforeEach(() => {
    resetECharts();
    chartStub = enqueueChart();
    __resetGraphicRuntime();
  });

  return {
    getChartStub(): ChartStub {
      return chartStub;
    },
  };
}

export function getLastGraphicOption(chartStub: ChartStub): any {
  return chartStub.setOption.mock.calls.at(-1)?.[0] as any;
}

export function getLastGraphicIds(chartStub: ChartStub): string[] {
  const optionArg = getLastGraphicOption(chartStub);
  const children = optionArg?.graphic?.elements?.[0]?.children as
    | Array<{ id?: string }>
    | undefined;
  return (children ?? []).map((item) => String(item.id));
}

export function getLastGraphicRootChildren(chartStub: ChartStub): Array<Record<string, unknown>> {
  const optionArg = getLastGraphicOption(chartStub);
  return (optionArg?.graphic?.elements?.[0]?.children ?? []) as Array<Record<string, unknown>>;
}
