import { defineComponent, h, nextTick, provide, shallowRef } from "vue";
import { expect, it, vi } from "vitest";
import { getInstanceByDom, graphic, use } from "echarts/core";
import { SVGRenderer } from "echarts/renderers";
import { INIT_OPTIONS_KEY, THEME_KEY } from "../src/ECharts";
import GraphicOverlay from "../demo/examples/GraphicOverlay.vue";
import { render } from "./helpers/testing";
import { flushAnimationFrame } from "./helpers/dom";

use([SVGRenderer]);

it("aligns overlay markers after narrow resizes and native axis layout changes", async () => {
  const theme = shallowRef({ valueAxis: { axisLabel: { fontSize: 12 } } });
  await render(
    defineComponent(() => {
      provide(INIT_OPTIONS_KEY, { renderer: "svg" });
      provide(THEME_KEY, theme);
      return () => h(GraphicOverlay);
    }),
  );
  await nextTick();
  const root = document.querySelector<HTMLElement>(".echarts");
  const host = root?.querySelector<HTMLElement>(".echarts-host");
  const chart = host && getInstanceByDom(host);
  if (!root || !chart) {
    throw new Error("Expected the graphic overlay chart.");
  }
  root.style.flexShrink = "0";
  const updates = vi.spyOn(chart, "setOption");
  const markers = [
    { id: "launch", dayIndex: 1, value: 182 },
    { id: "incident", dayIndex: 3, value: 92 },
    { id: "recovery", dayIndex: 5, value: 112 },
  ];

  async function expectAligned(width: number, height: number) {
    root!.style.width = `${width}px`;
    root!.style.height = `${height}px`;
    await vi.waitFor(() => {
      expect(chart!.getWidth()).toBe(width);
      expect(chart!.getHeight()).toBe(height);
      const elements = chart!.getZr().storage.getDisplayList();
      markers.forEach((marker) => {
        const dot = elements.find((element) => String(element.id) === `marker-dot-${marker.id}`);
        if (!(dot instanceof graphic.Circle)) {
          throw new Error(`Expected a circle for marker ${marker.id}.`);
        }
        const shape = dot.shape;
        const [x, y] = chart!.convertToPixel({ seriesIndex: 0 }, [marker.dayIndex, marker.value]);
        expect(Math.abs(shape.cx - x)).toBeLessThan(1);
        expect(Math.abs(shape.cy - y)).toBeLessThan(1);
      });
    });
  }

  try {
    await expectAligned(chart.getWidth(), chart.getHeight());
    await expectAligned(320, 180);
    await expectAligned(375, 240);
    theme.value = { valueAxis: { axisLabel: { fontSize: 28 } } };
    await nextTick();
    await expectAligned(375, 240);
    await expectAligned(980, 360);

    const settled = updates.mock.calls.length;
    await flushAnimationFrame();
    await flushAnimationFrame();
    expect(updates).toHaveBeenCalledTimes(settled);
  } finally {
    updates.mockRestore();
  }
});
