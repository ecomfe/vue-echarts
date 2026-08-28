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
      if (!chart || !container || !enabled) {
        wasZeroSized = false;
        return;
      }

      let observedWidth = chart.getWidth();
      let observedHeight = chart.getHeight();
      const isSynchronized = () =>
        !wasZeroSized && observedWidth === chart.getWidth() && observedHeight === chart.getHeight();

      const resize = () => {
        if (hasZeroDimension(observedWidth, observedHeight)) {
          wasZeroSized = true;
          return;
        }
        if (isSynchronized()) {
          return;
        }
        chart.resize();
        wasZeroSized = false;
        getOptions()?.onResize?.();
      };
      const throttledResize = wait ? throttle(resize, wait) : undefined;

      const observer = new ResizeObserver((entries) => {
        const rect = entries.find(({ target }) => target === container)?.contentRect;
        observedWidth = rect?.width ?? container.offsetWidth;
        observedHeight = rect?.height ?? container.offsetHeight;
        if (hasZeroDimension(observedWidth, observedHeight)) {
          wasZeroSized = true;
          return;
        }
        if (wasZeroSized) {
          resize();
        } else if (!isSynchronized()) {
          (throttledResize ?? resize)();
        }
      });

      observer.observe(container);
      onCleanup(() => {
        observer.disconnect();
        throttledResize?.clear();
      });
    },
    // Stop observer work before the outgoing chart can be disposed.
    { flush: "sync" },
  );
}

export const autoresizeProps = {
  autoresize: [Boolean, Object] as PropType<AutoResize>,
};
