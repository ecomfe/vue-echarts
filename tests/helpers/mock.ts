import { vi } from "vitest";

type InitFn = (typeof import("echarts/core"))["init"];
type ThrottleFn = (typeof import("echarts/core"))["throttle"];
type Throttled = ReturnType<ThrottleFn>;

export const init = vi.fn<InitFn>();
export const throttle = vi.fn<ThrottleFn>();

export function createEChartsModule() {
  return {
    init,
    throttle,
  } satisfies Partial<Record<string, unknown>>;
}

export interface ChartStub {
  setOption: ReturnType<typeof vi.fn>;
  resize: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
  isDisposed: ReturnType<typeof vi.fn>;
  getZr: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  setTheme: ReturnType<typeof vi.fn>;
  showLoading: ReturnType<typeof vi.fn>;
  hideLoading: ReturnType<typeof vi.fn>;
  group: string | undefined;
}

const queue: ChartStub[] = [];
let cursor = 0;

export function createChartStub(): ChartStub {
  const zr = {
    on: vi.fn(),
    off: vi.fn(),
  };

  return {
    setOption: vi.fn(),
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

const defaultThrottleImplementation: ThrottleFn = ((fn: any) => {
  const wrapped = ((...args: any[]) => fn(...args)) as Throttled;
  (wrapped as any).clear = vi.fn();
  (wrapped as any).dispose = vi.fn();
  (wrapped as any).pending = vi.fn(() => false);
  return wrapped;
}) as ThrottleFn;

export function resetECharts(): void {
  queue.length = 0;
  cursor = 0;

  init.mockReset();
  throttle.mockReset();

  init.mockImplementation(((...args: Parameters<InitFn>) => {
    void args;
    return ensureStub() as unknown as ReturnType<InitFn>;
  }) as InitFn);
  throttle.mockImplementation(defaultThrottleImplementation);
}

export function enqueueChart(): ChartStub {
  const stub = createChartStub();
  queue.push(stub);
  return stub;
}

resetECharts();
