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
        return;
      }

      let observedWidth = chart.getWidth();
      let observedHeight = chart.getHeight();

      const resize = () => {
        if (hasZeroDimension(observedWidth, observedHeight)) {
          return;
        }
        const width = chart.getWidth();
        const height = chart.getHeight();
        // CSS is applied to the public root; the internal host has no padding or scrollbars.
        if (container.clientWidth === width && container.clientHeight === height) {
          return;
        }
        // Let the renderer resolve fractional CSS sizes and explicit dimensions.
        // Only a real size change needs the ECharts update that stops animations.
        chart.getZr().resize();
        if (width === chart.getWidth() && height === chart.getHeight()) {
          return;
        }
        chart.resize();
        getOptions()?.onResize?.();
      };
      const throttledResize = wait ? throttle(resize, wait) : undefined;

      const observer = new ResizeObserver(([entry]) => {
        observedWidth = entry.contentRect.width;
        observedHeight = entry.contentRect.height;
        (throttledResize ?? resize)();
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
