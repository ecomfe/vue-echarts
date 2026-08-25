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

  watch(
    resizeSources,
    ([container, chart, enabled, wait], _, onCleanup) => {
      if (!chart) {
        sizedChart = undefined;
        return;
      }
      if (!container) {
        return;
      }

      const { offsetWidth, offsetHeight } = container;
      let observedWidth = offsetWidth;
      let observedHeight = offsetHeight;
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
        // Observer notifications can repeat, and throttled work can outlive its triggering size.
        if (chart.isDisposed()) {
          stop();
          return;
        }
        if (isZeroSize(observedWidth, observedHeight)) {
          wasZeroSized = true;
          return;
        }
        if (isSynchronized(observedWidth, observedHeight)) {
          return;
        }
        chart.resize();
        sizedWidth = observedWidth;
        sizedHeight = observedHeight;
        wasZeroSized = false;
        getOptions()?.onResize?.();
      };
      const throttledResize = wait ? throttle(resize, wait) : undefined;
      const runResize = throttledResize ?? resize;
      function stop(): void {
        observer.disconnect();
        throttledResize?.clear();
      }

      const observeResize = (entries?: ResizeObserverEntry[]) => {
        if (chart.isDisposed()) {
          stop();
          return;
        }
        const rect = entries?.find(({ target }) => target === container)?.contentRect;
        observedWidth = rect?.width ?? container.offsetWidth;
        observedHeight = rect?.height ?? container.offsetHeight;
        if (isZeroSize(observedWidth, observedHeight)) {
          wasZeroSized = true;
          return;
        }
        if (wasZeroSized) {
          resize();
        } else if (!isSynchronized(observedWidth, observedHeight)) {
          runResize();
        }
      };

      const observer = new ResizeObserver(observeResize);
      observeResize();
      observer.observe(container);

      onCleanup(stop);
    },
    // Stop observer work before the outgoing chart can be disposed.
    { flush: "sync" },
  );
}

export const autoresizeProps = {
  autoresize: [Boolean, Object] as PropType<AutoResize>,
};
