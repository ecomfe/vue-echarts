import { watch } from "vue";
import { throttle } from "echarts/core";

import type { Ref, PropType } from "vue";
import type { EChartsType, AutoResize } from "../types";
import { hasZeroDimension } from "../utils";

export function useAutoresize(
  chart: Ref<EChartsType | undefined>,
  autoresize: Ref<AutoResize | undefined>,
  container: Ref<HTMLElement | undefined>,
): () => void {
  let wasZeroSized = false;

  const getOptions = () => (typeof autoresize.value === "object" ? autoresize.value : undefined);
  const resizeSources = [
    container,
    chart,
    () => Boolean(autoresize.value),
    () => getOptions()?.throttle ?? 100,
  ] as const;

  return watch(
    resizeSources,
    ([container, chart, enabled, wait], _, onCleanup) => {
      if (!chart || chart.isDisposed()) {
        return;
      }
      if (!container) {
        return;
      }
      if (!enabled) {
        wasZeroSized = false;
        return;
      }

      const { offsetWidth, offsetHeight } = container;
      let observedWidth = offsetWidth;
      let observedHeight = offsetHeight;
      let active = true;
      const isSynchronized = (width: number, height: number) =>
        !wasZeroSized && width === chart.getWidth() && height === chart.getHeight();

      const resize = () => {
        // Observer notifications can repeat, and throttled work can outlive its triggering size.
        if (chart.isDisposed()) {
          stop();
          return;
        }
        if (hasZeroDimension(observedWidth, observedHeight)) {
          wasZeroSized = true;
          return;
        }
        if (isSynchronized(observedWidth, observedHeight)) {
          return;
        }
        chart.resize();
        if (!active || chart.isDisposed()) {
          stop();
          return;
        }
        wasZeroSized = false;
        getOptions()?.onResize?.();
      };
      const throttledResize = wait ? throttle(resize, wait) : undefined;
      const runResize = throttledResize ?? resize;
      function stop(): void {
        active = false;
        observer.disconnect();
        throttledResize?.clear();
      }

      const observeResize = (entries?: ResizeObserverEntry[]) => {
        if (!active) {
          return;
        }
        if (chart.isDisposed()) {
          stop();
          return;
        }
        const rect = entries?.find(({ target }) => target === container)?.contentRect;
        observedWidth = rect?.width ?? container.offsetWidth;
        observedHeight = rect?.height ?? container.offsetHeight;
        if (hasZeroDimension(observedWidth, observedHeight)) {
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
      onCleanup(stop);
      observeResize();
      if (active) {
        observer.observe(container);
      }
    },
    // Stop observer work before the outgoing chart can be disposed.
    { flush: "sync" },
  );
}

export const autoresizeProps = {
  autoresize: [Boolean, Object] as PropType<AutoResize>,
};
