import { describe, it, expect, vi } from "vitest";

// Mock non-browser environment for this file only
vi.mock("/src/utils.ts", async (importOriginal: any) => {
  const actual: any = await importOriginal();
  return { ...actual, isBrowser: () => false };
});

import { h, defineComponent, shallowRef, watchEffect } from "vue";
import { render, cleanup } from "./helpers/testing";
import { useSlotOption } from "../src/composables/slot";

describe("SSR environment", () => {
  it("slot: teleportedSlots undefined and formatter returns undefined", async () => {
    const exposed = shallowRef<any>();
    const Probe = defineComponent({
      setup(_, ctx) {
        const { teleportedSlots, patchOption } = useSlotOption(ctx.slots, () => {});
        (ctx as any).expose({ teleportedSlots, patchOption });
        return () => h("div", teleportedSlots());
      },
    });

    const Root = defineComponent({
      setup() {
        const r = shallowRef<any>();
        watchEffect(() => {
          if (r.value) exposed.value = r.value;
        });
        return () =>
          h(Probe, { ref: (v: any) => (r.value = v) }, { tooltip: () => [h("span", "x")] });
      },
    });

    render(Root);

    const vnode = exposed.value!.teleportedSlots();
    expect(vnode).toBeUndefined();

    const patched: any = exposed.value!.patchOption({});
    const container = patched.tooltip?.formatter?.({ dataIndex: 0 });
    expect(container).toBeUndefined();

    cleanup();
  });
});
