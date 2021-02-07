import { Ref, watch } from "vue";
import { addListener, removeListener, ResizeCallback } from "resize-detector";
import { EChartsType, OptionsType } from "@/types";

export function useAutoresize(
  chart: Ref<EChartsType | undefined>,
  autoresize: Ref<boolean>,
  root: Ref<HTMLElement | undefined>,
  options: Ref<OptionsType>
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
      resizeListener = () => {
        if (lastArea === 0) {
          chart.setOption(Object.create(null), true);
          chart.resize();
          chart.setOption(options.value, true);
        } else {
          chart.resize();
        }
        lastArea = getArea();
      };

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
