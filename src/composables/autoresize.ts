import { watch } from "vue";
import { throttle } from "echarts/core";

import type { Ref, PropType } from "vue";
import type { EChartsType, AutoResize } from "../types";

export function useAutoresize(
  chart: Ref<EChartsType | undefined>,
  autoresize: Ref<AutoResize | undefined>,
  root: Ref<HTMLElement | undefined>,
): void {
  // Preserve the last synchronized size while observation is disabled or being rebound.
  let sizedChart: EChartsType | undefined;
  let sizedWidth = 0;
  let sizedHeight = 0;

  const getOptions = () => (typeof autoresize.value === "object" ? autoresize.value : undefined);
  const resizeSources = [
    root,
    chart,
    () => Boolean(autoresize.value),
    () => getOptions()?.throttle ?? 100,
  ] as const;

  watch(resizeSources, ([root, chart, enabled, wait], _, onCleanup) => {
    if (!chart) {
      sizedChart = undefined;
      return;
    }
    if (!root) {
      return;
    }

    const { offsetWidth, offsetHeight } = root;
    if (chart !== sizedChart) {
      sizedChart = chart;
      sizedWidth = offsetWidth;
      sizedHeight = offsetHeight;
    }
    if (!enabled) {
      return;
    }

    const resize = () => {
      const { offsetWidth, offsetHeight } = root;
      // Observer notifications can repeat, and throttled work can outlive its triggering size.
      if (
        offsetWidth === 0 ||
        offsetHeight === 0 ||
        (offsetWidth === sizedWidth && offsetHeight === sizedHeight)
      ) {
        return;
      }
      chart.resize();
      sizedWidth = offsetWidth;
      sizedHeight = offsetHeight;
      getOptions()?.onResize?.();
    };
    const throttledResize = wait ? throttle(resize, wait) : undefined;
    const runResize = throttledResize ?? resize;

    if (
      offsetWidth !== 0 &&
      offsetHeight !== 0 &&
      (offsetWidth !== sizedWidth || offsetHeight !== sizedHeight)
    ) {
      runResize();
    }

    const observer = new ResizeObserver(runResize);
    observer.observe(root);

    onCleanup(() => {
      observer.disconnect();
      throttledResize?.clear();
    });
  });
}

export const autoresizeProps = {
  autoresize: [Boolean, Object] as PropType<AutoResize>,
};
