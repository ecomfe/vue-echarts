import { defineComponent, h } from "vue";
import type { Ref, VNodeRef } from "vue";
import { render } from "vitest-browser-vue/pure";

import ECharts from "../../src/ECharts";
import type { ComponentExposed } from "vue-component-type-helpers";

export type RenderChartProps = () => Record<string, unknown>;

export function renderChart<T extends ComponentExposed<typeof ECharts>>(
  propsFactory: RenderChartProps,
  exposes: Ref<T | undefined>,
) {
  const setExposed: VNodeRef = (value) => {
    exposes.value = value ? (value as T) : undefined;
  };

  const Root = defineComponent({
    setup() {
      return () =>
        h(ECharts, {
          ...propsFactory(),
          ref: setExposed,
        });
    },
  });

  return render(Root);
}
