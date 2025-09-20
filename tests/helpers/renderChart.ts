import { defineComponent, h, type Ref } from "vue";
import { render } from "vitest-browser-vue/pure";

import ECharts from "../../src/ECharts";

export type RenderChartProps = () => Record<string, unknown>;

export function renderChart(propsFactory: RenderChartProps, exposes: Ref<any>) {
  const Root = defineComponent({
    setup() {
      return () =>
        h(ECharts, {
          ...propsFactory(),
          ref: (value: unknown) => {
            exposes.value = value;
          },
        });
    },
  });

  return render(Root);
}
