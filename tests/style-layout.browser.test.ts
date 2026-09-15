import { defineComponent, h, nextTick, ref, shallowRef } from "vue";
import { describe, expect, it } from "vitest";
import { use } from "echarts/core";
import { TitleComponent } from "echarts/components";
import { CanvasRenderer, SVGRenderer } from "echarts/renderers";
import type { ComponentExposed } from "vue-component-type-helpers";
import ECharts from "../src/ECharts";
import { render } from "./helpers/testing";

use([CanvasRenderer, SVGRenderer, TitleComponent]);

describe("chart layout styles", () => {
  it.each(["canvas", "svg"] as const)(
    "shrinks in column layouts and passes root rounding to the %s renderer",
    async (renderer) => {
      const height = ref(300);
      const exposed = shallowRef<ComponentExposed<typeof ECharts>>();
      const Root = defineComponent({
        setup() {
          return () =>
            h(
              "div",
              {
                style: {
                  display: "flex",
                  flexDirection: "column",
                  width: "300px",
                  height: `${height.value}px`,
                },
              },
              [
                h("div", { style: { flex: "none", height: "100px" } }, "Toolbar"),
                h(ECharts, {
                  ref: exposed,
                  option: { backgroundColor: "red", title: { text: "Chart" } },
                  initOptions: { renderer },
                  autoresize: { throttle: 0 },
                  style: { flex: "1", borderRadius: "16px" },
                }),
              ],
            );
        },
      });

      await render(Root);
      await nextTick();
      const instance = exposed.value;
      if (!instance) {
        throw new Error("Expected the chart to be mounted.");
      }
      expect(instance.getHeight()).toBe(200);

      height.value = 200;
      await nextTick();
      await expect.poll(() => instance.getHeight()).toBe(100);
      expect(instance.root?.getBoundingClientRect().height).toBe(100);

      const host = instance.getDom();
      const viewport = host.firstElementChild;
      const surface = host.querySelector(renderer);
      if (!viewport || !surface) {
        throw new Error(`Expected the ${renderer} surface to be rendered.`);
      }
      expect(getComputedStyle(host).borderRadius).toBe("16px");
      expect(getComputedStyle(viewport).borderRadius).toBe("16px");
      if (renderer === "canvas") {
        expect(getComputedStyle(surface).borderRadius).toBe("16px");
      } else {
        expect(getComputedStyle(viewport).overflow).toBe("hidden");
      }
    },
  );
});
