import { describe, it, expect } from "vitest";
import { createSSRApp, defineComponent, h, shallowRef } from "vue";
import { renderToString } from "@vue/server-renderer";

import { useSlotOption } from "../src/composables/slot";
import ECharts from "../src/ECharts";
import { GRect } from "../src/graphic/components";
import { registerExtension } from "../src/graphic/extension";
import type { Option } from "../src/types";
import { makeTooltipParams } from "./helpers/tooltip";
import { GRAPHIC_SSR_MARKUP } from "./helpers/ssr";
import type { TooltipComponentOption } from "echarts";

describe("SSR environment", () => {
  it("slot: render undefined and formatter returns undefined", async () => {
    const exposed = shallowRef<{
      render: () => unknown;
      prepare: (option: Option) => { option: Option };
    }>();

    const Probe = defineComponent({
      setup(_, ctx) {
        const slot = useSlotOption(ctx.slots, () => {});
        slot.setReady(true);
        exposed.value = slot;
        return () => h("div", slot.render());
      },
    });

    const app = createSSRApp({
      render: () => h(Probe, null, { tooltip: () => [h("span", "x")] }),
    });

    await renderToString(app);

    const instance = exposed.value;
    if (!instance) {
      throw new Error("Expected slot helpers to be exposed.");
    }

    const vnode = instance.render();
    expect(vnode).toBeUndefined();

    const patched = instance.prepare({}).option;
    const tooltip = (
      patched as {
        tooltip?: TooltipComponentOption | TooltipComponentOption[];
      }
    ).tooltip;
    if (!tooltip || Array.isArray(tooltip) || typeof tooltip.formatter !== "function") {
      throw new Error("Expected tooltip formatter to be set.");
    }
    const container = tooltip.formatter(makeTooltipParams(0), "");
    expect(container).toBeUndefined();
  });

  it("renders graphic anchors that can be hydrated", async () => {
    registerExtension();

    const app = createSSRApp({
      render: () =>
        h(
          ECharts,
          { option: {} },
          { graphic: () => h(GRect, { id: "server-rect", width: 20, height: 10 }) },
        ),
    });

    expect(await renderToString(app)).toBe(GRAPHIC_SSR_MARKUP);
  });
});
