import { vi } from "vitest";

import type { Mock } from "vitest";
import type { init as echartsInit, throttle as echartsThrottle } from "echarts/core";
import type { EChartsType } from "../../src/types";

type InitFn = typeof echartsInit;
type ThrottleFn = typeof echartsThrottle;
type ThrottleFunction = Parameters<ThrottleFn>[0];
type ThrottleControls = {
  clear: () => void;
  dispose: () => void;
  pending: () => boolean;
};

export const init = vi.fn<InitFn>();
export const throttle = vi.fn<ThrottleFn>();
export const use = vi.fn((modules?: unknown[]) => {
  void modules;
});

export function createEChartsModule() {
  return {
    init,
    throttle,
    use,
  } satisfies Partial<Record<string, unknown>>;
}

type ZRenderStub = {
  on: Mock;
  off: Mock;
};

type MockedMethod<T> = T extends (...args: infer Args) => infer R
  ? Mock<(...args: Args) => R>
  : never;

type ChartMethodKeys =
  | "setOption"
  | "resize"
  | "dispose"
  | "isDisposed"
  | "setTheme"
  | "showLoading"
  | "hideLoading";

type ChartMethodMocks = {
  [K in ChartMethodKeys]: MockedMethod<EChartsType[K]>;
};

export interface ChartStub extends ChartMethodMocks {
  getOption: Mock<() => unknown>;
  getZr: Mock<() => ZRenderStub>;
  on: Mock<(event: string, handler: (...args: unknown[]) => void) => void>;
  off: Mock<(event: string, handler: (...args: unknown[]) => void) => void>;
  group: string | undefined;
}

const queue: ChartStub[] = [];
let cursor = 0;

export function createChartStub(): ChartStub {
  const zr: ZRenderStub = {
    on: vi.fn(),
    off: vi.fn(),
  };
  let lastOption: unknown;

  return {
    setOption: vi.fn((option: unknown) => {
      lastOption = option;
    }),
    getOption: vi.fn(() => lastOption),
    resize: vi.fn(),
    dispose: vi.fn(),
    isDisposed: vi.fn(() => false),
    getZr: vi.fn(() => zr),
    on: vi.fn(),
    off: vi.fn(),
    setTheme: vi.fn(),
    showLoading: vi.fn(),
    hideLoading: vi.fn(),
    group: undefined,
  };
}

function ensureStub(): ChartStub {
  if (cursor >= queue.length) {
    queue.push(createChartStub());
  }
  return queue[cursor++];
}

const defaultThrottleImplementation: ThrottleFn = ((fn) => {
  const wrapped = ((...args: Parameters<ThrottleFunction>) =>
    (fn as (...args: Parameters<ThrottleFunction>) => unknown)(...args)) as ReturnType<ThrottleFn> &
    ThrottleControls;
  wrapped.clear = vi.fn();
  wrapped.dispose = vi.fn();
  wrapped.pending = vi.fn(() => false);
  return wrapped;
}) as ThrottleFn;

export function resetECharts(): void {
  queue.length = 0;
  cursor = 0;

  init.mockReset();
  throttle.mockReset();
  use.mockReset();

  init.mockImplementation((...args: Parameters<InitFn>) => {
    void args;
    return ensureStub() as unknown as ReturnType<InitFn>;
  });
  throttle.mockImplementation(defaultThrottleImplementation);
  use.mockImplementation((modules?: unknown[]) => {
    void modules;
  });
}

export function enqueueChart(): ChartStub {
  const stub = createChartStub();
  queue.push(stub);
  return stub;
}

resetECharts();
