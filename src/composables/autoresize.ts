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
    () => getOptions()?.onResize,
  ] as const;

  watch(resizeSources, ([root, chart, enabled, wait, onResize], _, onCleanup) => {
    if (!root || !chart) {
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

    let initialResizeTriggered = false;

    const resize = () => {
      chart.resize();
      sizedWidth = root.offsetWidth;
      sizedHeight = root.offsetHeight;
      onResize?.();
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

    const observer = new ResizeObserver(() => {
      // ResizeObserver reports the initial dimensions even when they have not changed.
      if (!initialResizeTriggered) {
        initialResizeTriggered = true;
        if (root.offsetWidth === offsetWidth && root.offsetHeight === offsetHeight) {
          return;
        }
      }

      if (root.offsetWidth === 0 || root.offsetHeight === 0) {
        return;
      }

      runResize();
    });
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
