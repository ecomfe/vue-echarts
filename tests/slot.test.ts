import { describe, it, expect, vi } from "vitest";
import {
  defineComponent,
  h,
  nextTick,
  ref,
  shallowRef,
  watchEffect,
  type PropType,
} from "vue";
import { render } from "./helpers/testing";

import { useSlotOption } from "../src/composables/slot";
import { withConsoleWarn } from "./helpers/dom";

type SlotTestHandle = {
  patchOption: ReturnType<typeof useSlotOption>["patchOption"];
  teleportedSlots: ReturnType<typeof useSlotOption>["teleportedSlots"];
};

const SlotTestComponent = defineComponent({
  props: {
    onChange: {
      type: Function as PropType<() => void>,
      default: undefined,
    },
  },
  setup(props, ctx) {
    const { teleportedSlots, patchOption } = useSlotOption(
      ctx.slots,
      props.onChange ?? (() => {}),
    );

    ctx.expose({ patchOption, teleportedSlots });

    return () => h("div", teleportedSlots());
  },
});

type SlotDictionary = Record<string, (...args: any[]) => any>;

// cleanup and document reset are handled in tests/setup.ts

function renderSlotComponent(
  slotFactory: () => SlotDictionary,
  onChange?: () => void,
): { exposed: ReturnType<typeof shallowRef<SlotTestHandle | undefined>> } {
  const exposed = shallowRef<SlotTestHandle>();

  const Root = defineComponent({
    setup() {
      const componentRef = shallowRef<SlotTestHandle>();

      watchEffect(() => {
        if (componentRef.value) {
          exposed.value = componentRef.value;
        }
      });

      return () =>
        h(
          SlotTestComponent,
          {
            ref: (value: unknown) => {
              componentRef.value = value as SlotTestHandle;
            },
            onChange,
          },
          slotFactory(),
        );
    },
  });

  render(Root);

  return {
    exposed,
  };
}

describe("useSlotOption", () => {
  it("returns a Teleport vnode after mount", async () => {
    const { exposed } = renderSlotComponent(() => ({
      tooltip: () => [h("span", "t")],
    }));

    // Component is mounted by the test renderer synchronously; teleportedSlots should return a Teleport VNode
    const vnode: any = exposed.value!.teleportedSlots();
    expect(vnode).toBeTruthy();
    expect(vnode.type?.__isTeleport).toBe(true);
  });

  it("patches tooltip slots and renders teleported content", async () => {
    const changeSpy = vi.fn();

    const { exposed } = renderSlotComponent(
      () => ({
        tooltip: (params: any) => [h("span", `tooltip-${params?.dataIndex}`)],
      }),
      changeSpy,
    );

    await nextTick();
    changeSpy.mockClear();

    const patched: any = exposed.value!.patchOption({});
    expect(changeSpy).not.toHaveBeenCalled();

    expect(typeof patched.tooltip?.formatter).toBe("function");
    const container = patched.tooltip!.formatter!({ dataIndex: 42 });
    expect(container).toBeInstanceOf(HTMLElement);

    await nextTick();
    expect(container.textContent).toBe("tooltip-42");
  });

  it("patches dataView slots and renders teleported content", async () => {
    const changeSpy = vi.fn();

    const { exposed } = renderSlotComponent(
      () => ({
        dataView: () => [h("span", "data-view")],
      }),
      changeSpy,
    );

    await nextTick();
    changeSpy.mockClear();

    const patched: any = exposed.value!.patchOption({
      toolbox: { feature: {} },
    });
    expect(changeSpy).not.toHaveBeenCalled();

    const optionToContent = patched.toolbox?.feature?.dataView?.optionToContent;
    expect(typeof optionToContent).toBe("function");
    const container = optionToContent?.({});
    expect(container).toBeInstanceOf(HTMLElement);

    await nextTick();
    expect(container?.textContent).toBe("data-view");
  });

  it("notifies when slot set changes and cleans state", async () => {
    const changeSpy = vi.fn();
    const showExtra = ref(true);

    const { exposed } = renderSlotComponent(() => {
      const slots: SlotDictionary = {
        tooltip: (params: any) => [h("span", `tooltip-${params?.dataIndex}`)],
      };
      if (showExtra.value) {
        slots["tooltip-extra"] = () => [h("span", "extra")];
      }
      return slots;
    }, changeSpy);

    await nextTick();
    changeSpy.mockClear();

    const patched: any = exposed.value!.patchOption({});
    expect(typeof patched.tooltip?.formatter).toBe("function");
    patched.tooltip!.formatter!({ dataIndex: 1 });
    await nextTick();

    showExtra.value = false;
    await nextTick();

    expect(changeSpy).toHaveBeenCalledTimes(1);

    const patchedAfterRemoval: any = exposed.value!.patchOption({});
    expect(patchedAfterRemoval["tooltip-extra"]).toBeUndefined();
  });

  it("warns and skips invalid slot names", async () => {
    const changeSpy = vi.fn();
    const { exposed } = renderSlotComponent(
      () => ({
        legend: () => [h("span", "legend")],
      }),
      changeSpy,
    );

    await nextTick();
    changeSpy.mockClear();

    withConsoleWarn((warnSpy) => {
      const patched: any = exposed.value!.patchOption({});
      const flattened = warnSpy.mock.calls.flat().join(" ");

      expect(flattened).toContain("Invalid vue-echarts slot name: legend");
      expect(patched.legend).toBeUndefined();
      expect(changeSpy).not.toHaveBeenCalled();
    });
  });

  it("clones existing array branches when patching series tooltip slots", async () => {
    const { exposed } = renderSlotComponent(() => ({
      "tooltip-series-0": () => [h("span", "series-0")],
    }));

    await nextTick();

    const originalOption = {
      series: [
        {
          tooltip: {},
        },
      ],
    };

    const patched: any = exposed.value!.patchOption(originalOption);

    expect(patched).not.toBe(originalOption);
    expect(patched.series).not.toBe(originalOption.series);

    const formatter = patched.series?.[0]?.tooltip?.formatter;
    expect(typeof formatter).toBe("function");

    const container = formatter?.({ dataIndex: 7 });
    expect(container).toBeInstanceOf(HTMLElement);

    await nextTick();
    expect(container?.textContent).toBe("series-0");
  });

  it("creates array shells when target slot path is missing", async () => {
    const { exposed } = renderSlotComponent(() => ({
      "tooltip-series-1": () => [h("span", "series-1")],
    }));

    await nextTick();

    const patched: any = exposed.value!.patchOption({});

    const formatter = patched.series?.[1]?.tooltip?.formatter;
    expect(typeof formatter).toBe("function");

    const container = formatter?.({ dataIndex: 3 });
    expect(container).toBeInstanceOf(HTMLElement);

    await nextTick();
    expect(container?.textContent).toBe("series-1");
  });
});
