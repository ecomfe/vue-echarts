import { Ref, watch } from "vue-demi";
import { throttle } from "echarts/core";
import { addListener, removeListener, ResizeCallback } from "resize-detector";
import { EChartsType, OptionType } from "../types";

export function useAutoresize(
  chart: Ref<EChartsType | undefined>,
  autoresize: Ref<boolean>,
  root: Ref<HTMLElement | undefined>,
  option: Ref<OptionType>
): void {
  let resizeListener: ResizeCallback | null = null;
  let lastArea = 0;

  function getArea() {
    const el = root.value;
    if (!el) {
      return 0;
    }
    return el.offsetWidth * el.offsetHeight;
  }

  watch([root, chart, autoresize], ([root, chart, autoresize], _, cleanup) => {
    if (root && chart && autoresize) {
      lastArea = getArea();
      resizeListener = throttle(() => {
        if (lastArea === 0) {
          chart.setOption(Object.create(null), true);
          chart.resize();
          chart.setOption(option.value, true);
        } else {
          chart.resize();
        }
        lastArea = getArea();
      }, 100);

      addListener(root, resizeListener);
    }

    cleanup(() => {
      if (resizeListener && root) {
        lastArea = 0;
        removeListener(root, resizeListener);
      }
    });
  });
}

export const autoresizeProps = {
  autoresize: Boolean
};
