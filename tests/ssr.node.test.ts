import { describe, it, expect } from "vitest";
import { createSSRApp, defineComponent, h, shallowRef } from "vue";
import { renderToString } from "@vue/server-renderer";

import { useSlotOption } from "../src/composables/slot";
import type { Option } from "../src/types";
import { makeTooltipParams } from "./helpers/tooltip";
import type { TooltipComponentOption } from "echarts";

describe("SSR environment", () => {
  it("slot: teleportedSlots undefined and formatter returns undefined", async () => {
    const exposed = shallowRef<{
      teleportedSlots: () => unknown;
      patchOption: (option: Option) => Option;
    }>();

    const Probe = defineComponent({
      setup(_, ctx) {
        const { teleportedSlots, patchOption } = useSlotOption(ctx.slots, () => {});
        exposed.value = { teleportedSlots, patchOption };
        return () => h("div", teleportedSlots());
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

    const vnode = instance.teleportedSlots();
    expect(vnode).toBeUndefined();

    const patched = instance.patchOption({});
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
});
