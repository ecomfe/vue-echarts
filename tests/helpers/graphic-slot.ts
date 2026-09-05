import { beforeEach } from "vitest";
import type { ChartStub } from "./mock";
import { enqueueChart, resetECharts } from "./mock";

export function setupGraphicSlotSuite() {
  let chartStub: ChartStub;

  beforeEach(() => {
    resetECharts();
    chartStub = enqueueChart();
  });

  return {
    getChartStub(): ChartStub {
      return chartStub;
    },
  };
}

export function getLastGraphicOption(chartStub: ChartStub): any {
  const lastCall = chartStub.setOption.mock.calls.at(-1);
  if (!lastCall) {
    throw new Error("Expected chart.setOption to be called at least once.");
  }
  return lastCall[0] as any;
}

export function getLastGraphicIds(chartStub: ChartStub): string[] {
  return getLastGraphicChanges(chartStub).map((item) => String(item.id));
}

// Read either a complete tree or the changed subtrees of a native graphic patch.
export function getLastGraphicChanges(chartStub: ChartStub): Array<Record<string, any>> {
  const elements = getLastGraphicOption(chartStub)?.graphic?.elements ?? [];
  if (elements[0]?.children) {
    return elements[0].children;
  }
  const nodes = new Map<string, Record<string, any>>(
    elements.map((element: Record<string, any>) => [element.id, { ...element }]),
  );
  const roots: Array<Record<string, any>> = [];
  for (const node of nodes.values()) {
    const parent = nodes.get(node.parentId);
    if (parent) {
      (parent.children ??= []).push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}
