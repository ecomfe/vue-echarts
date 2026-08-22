import { watch } from "vue";
import { throttle } from "echarts/core";

import type { Ref, PropType } from "vue";
import type { EChartsType, AutoResize } from "../types";

export function useAutoresize(
  chart: Ref<EChartsType | undefined>,
  autoresize: Ref<AutoResize | undefined>,
  root: Ref<HTMLElement | undefined>,
): void {
  watch([root, chart, autoresize], ([root, chart, autoresize], _, onCleanup) => {
    if (!root || !chart || !autoresize) {
      return;
    }

    const { offsetWidth, offsetHeight } = root;
    const { throttle: wait = 100, onResize } = autoresize === true ? {} : autoresize;
    let initialResizeTriggered = false;

    const resize = () => {
      chart.resize();
      onResize?.();
    };
    const throttledResize = wait ? throttle(resize, wait) : undefined;
    const runResize = throttledResize ?? resize;

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
