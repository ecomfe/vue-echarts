import { describe, it, expect, beforeEach, vi } from "vitest";
import { defineComponent, h, nextTick, shallowRef } from "vue";

import { render } from "./helpers/testing";
import { enqueueChart, resetECharts, type ChartStub } from "./helpers/mock";

let chartStub: ChartStub;

describe("ECharts component (wc unregistered)", () => {
  beforeEach(() => {
    resetECharts();
    chartStub = enqueueChart();
  });

  it("calls cleanup directly when web component registration fails", async () => {
    vi.resetModules();

    vi.doMock("../src/wc", () => ({
      TAG_NAME: "x-vue-echarts",
      register: () => false,
    }));

    const { default: ECharts } = await import("../src/ECharts");

    const exposed = shallowRef<any>();
    const Root = defineComponent({
      setup() {
        return () =>
          h(ECharts, {
            option: { title: { text: "no-wc" } },
            ref: (v: any) => (exposed.value = v),
          });
      },
    });

    const screen = render(Root);
    await nextTick();

    chartStub.dispose.mockClear();

    screen.unmount();
    await nextTick();

    expect(chartStub.dispose).toHaveBeenCalledTimes(1);

    vi.doUnmock("../src/wc");
  });
});
