import { describe, it, expect } from "vitest";
import { createSSRApp, defineComponent, h, shallowRef } from "vue";
import { renderToString } from "@vue/server-renderer";

import { useSlotOption } from "../src/composables/slot";

describe("SSR environment", () => {
  it("slot: teleportedSlots undefined and formatter returns undefined", async () => {
    const exposed = shallowRef<{
      teleportedSlots: () => unknown;
      patchOption: (option: Record<string, unknown>) => Record<string, unknown>;
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

    const vnode = exposed.value?.teleportedSlots();
    expect(vnode).toBeUndefined();

    const patched = exposed.value?.patchOption({});
    const container = (patched as any)?.tooltip?.formatter?.({ dataIndex: 0 });
    expect(container).toBeUndefined();
  });
});
