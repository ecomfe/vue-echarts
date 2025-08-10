import { watch } from "vue";
import { throttle } from "echarts/core";

import type { Ref, PropType } from "vue";
import type { EChartsType, AutoResize } from "../types";

export function useAutoresize(
  chart: Ref<EChartsType | undefined>,
  autoresize: Ref<AutoResize | undefined>,
  root: Ref<HTMLElement | undefined>,
): void {
  watch(
    [root, chart, autoresize],
    ([root, chart, autoresize], _, onCleanup) => {
      let ro: ResizeObserver | null = null;

      if (root && chart && autoresize) {
        const { offsetWidth, offsetHeight } = root;
        const autoresizeOptions = autoresize === true ? {} : autoresize;
        const { throttle: wait = 100, onResize } = autoresizeOptions;

        let initialResizeTriggered = false;

        const callback = () => {
          chart.resize();
          onResize?.();
        };

        const resizeCallback = wait ? throttle(callback, wait) : callback;

        ro = new ResizeObserver(() => {
          // We just skip ResizeObserver's initial resize callback if the
          // size has not changed since the chart is rendered.
          if (!initialResizeTriggered) {
            initialResizeTriggered = true;
            if (
              root.offsetWidth === offsetWidth &&
              root.offsetHeight === offsetHeight
            ) {
              return;
            }
          }

          // Skip if container has zero size
          if (root.offsetWidth === 0 || root.offsetHeight === 0) {
            return;
          }

          resizeCallback();
        });
        ro.observe(root);
      }

      onCleanup(() => {
        if (ro) {
          ro.disconnect();
          ro = null;
        }
      });
    },
  );
}

export const autoresizeProps = {
  autoresize: [Boolean, Object] as PropType<AutoResize>,
};
