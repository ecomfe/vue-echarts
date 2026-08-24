import { watch } from "vue";
import { throttle } from "echarts/core";

import type { Ref, PropType } from "vue";
import type { EChartsType, AutoResize } from "../types";

const isZeroSize = (width: number, height: number) => width === 0 || height === 0;

export function useAutoresize(
  chart: Ref<EChartsType | undefined>,
  autoresize: Ref<AutoResize | undefined>,
  container: Ref<HTMLElement | undefined>,
): void {
  // Cache observer work, but invalidate it while disabled so autoresize can retake control.
  let sizedChart: EChartsType | undefined;
  let sizedWidth: number | undefined;
  let sizedHeight: number | undefined;
  let wasZeroSized = false;

  const getOptions = () => (typeof autoresize.value === "object" ? autoresize.value : undefined);
  const resizeSources = [
    container,
    chart,
    () => Boolean(autoresize.value),
    () => getOptions()?.throttle ?? 100,
  ] as const;

  watch(resizeSources, ([container, chart, enabled, wait], _, onCleanup) => {
    if (!chart) {
      sizedChart = undefined;
      return;
    }
    if (!container) {
      return;
    }

    const { offsetWidth, offsetHeight } = container;
    if (chart !== sizedChart) {
      sizedChart = chart;
      sizedWidth = offsetWidth;
      sizedHeight = offsetHeight;
      wasZeroSized = isZeroSize(offsetWidth, offsetHeight);
    }
    if (!enabled) {
      sizedWidth = sizedHeight = undefined;
      return;
    }

    const isSynchronized = (width: number, height: number): boolean => {
      if (wasZeroSized) {
        return false;
      }
      if (width === sizedWidth && height === sizedHeight) {
        return true;
      }
      if (width !== chart.getWidth() || height !== chart.getHeight()) {
        return false;
      }
      sizedWidth = width;
      sizedHeight = height;
      return true;
    };

    const resize = () => {
      const { offsetWidth, offsetHeight } = container;
      // Observer notifications can repeat, and throttled work can outlive its triggering size.
      if (isZeroSize(offsetWidth, offsetHeight)) {
        wasZeroSized = true;
        return;
      }
      if (isSynchronized(offsetWidth, offsetHeight)) {
        return;
      }
      chart.resize();
      sizedWidth = offsetWidth;
      sizedHeight = offsetHeight;
      wasZeroSized = false;
      getOptions()?.onResize?.();
    };
    const throttledResize = wait ? throttle(resize, wait) : undefined;
    const runResize = throttledResize ?? resize;

    const observeResize = () => {
      const { offsetWidth, offsetHeight } = container;
      if (isZeroSize(offsetWidth, offsetHeight)) {
        wasZeroSized = true;
        return;
      }
      if (wasZeroSized) {
        resize();
      } else if (!isSynchronized(offsetWidth, offsetHeight)) {
        runResize();
      }
    };

    observeResize();
    const observer = new ResizeObserver(observeResize);
    observer.observe(container);

    onCleanup(() => {
      observer.disconnect();
      throttledResize?.clear();
    });
  });
}

export const autoresizeProps = {
  autoresize: [Boolean, Object] as PropType<AutoResize>,
};
