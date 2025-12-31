import { describe, it, expect, vi } from "vitest";
import { defineComponent, h, nextTick, ref, shallowRef, watchEffect } from "vue";
import type { PropType, Ref, VNodeChild, VNodeRef } from "vue";
import { render } from "./helpers/testing";
import { makeTooltipParams } from "./helpers/tooltip";

import { useSlotOption } from "../src/composables/slot";
import { withConsoleWarn } from "./helpers/dom";
import type { Option } from "../src/types";
import type {
  ToolboxComponentOption,
  TooltipComponentFormatterCallbackParams,
  TooltipComponentFormatterCallback,
  TooltipComponentOption,
} from "echarts";

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
    const { teleportedSlots, patchOption } = useSlotOption(ctx.slots, props.onChange ?? (() => {}));

    ctx.expose({ patchOption, teleportedSlots });

    return () => h("div", teleportedSlots());
  },
});

type SlotDictionary = Record<string, (...args: unknown[]) => VNodeChild>;
type TooltipFormatter = TooltipComponentFormatterCallback<TooltipComponentFormatterCallbackParams>;

// cleanup and document reset are handled in tests/setup.ts

function getExposed(exposed: Ref<SlotTestHandle | undefined>): SlotTestHandle {
  const instance = exposed.value;
  if (!instance) {
    throw new Error("Expected slot test component to expose helpers.");
  }
  return instance;
}

function isSlotTestHandle(value: unknown): value is SlotTestHandle {
  return (
    typeof value === "object" &&
    value !== null &&
    "patchOption" in value &&
    "teleportedSlots" in value
  );
}

function renderSlotComponent(
  slotFactory: () => SlotDictionary,
  onChange?: () => void,
): { exposed: ReturnType<typeof shallowRef<SlotTestHandle | undefined>> } {
  const exposed = shallowRef<SlotTestHandle>();

  const Root = defineComponent({
    setup() {
      const componentRef = shallowRef<SlotTestHandle>();
      const setExposed: VNodeRef = (value) => {
        componentRef.value = isSlotTestHandle(value) ? value : undefined;
      };

      watchEffect(() => {
        if (componentRef.value) {
          exposed.value = componentRef.value;
        }
      });

      return () =>
        h(
          SlotTestComponent,
          {
            ref: setExposed,
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

function getTooltipFormatter(
  option: Option,
  label: string,
): TooltipFormatter {
  const tooltip = (option as {
    tooltip?: TooltipComponentOption | TooltipComponentOption[];
  }).tooltip;
  if (!tooltip || Array.isArray(tooltip)) {
    throw new Error(`Expected ${label} tooltip to be a single object.`);
  }
  if (typeof tooltip.formatter !== "function") {
    throw new Error(`Expected ${label} tooltip formatter to be injected.`);
  }
  return tooltip.formatter;
}

function getToolboxOption(option: Option): ToolboxComponentOption {
  const toolbox = option.toolbox;
  if (!toolbox || Array.isArray(toolbox)) {
    throw new Error("Expected toolbox option to be a single object.");
  }
  return toolbox;
}

function hasTooltipOption(value: unknown): value is { tooltip?: TooltipComponentOption } {
  return typeof value === "object" && value !== null && "tooltip" in value;
}

function getSeriesOption(option: Option, index: number): TooltipComponentOption {
  const series = option.series;
  if (!series || (typeof series !== "object" && !Array.isArray(series))) {
    throw new Error(`Expected series[${index}] to be available.`);
  }
  const entry = Array.isArray(series)
    ? series[index]
    : (series as Record<string, unknown>)[String(index)];
  if (!entry) {
    throw new Error(`Expected series[${index}] to be available.`);
  }
  if (!hasTooltipOption(entry) || !entry.tooltip || Array.isArray(entry.tooltip)) {
    throw new Error(`Expected series[${index}] tooltip to be available.`);
  }
  return entry.tooltip;
}

describe("useSlotOption", () => {
  it("patches tooltip slots and renders teleported content", async () => {
    const changeSpy = vi.fn();

    const { exposed } = renderSlotComponent(
      () => ({
        tooltip: (...args: unknown[]) => {
          const params = args[0] as { dataIndex: number };
          return [h("span", `tooltip-${params.dataIndex}`)];
        },
      }),
      changeSpy,
    );

    await nextTick();
    changeSpy.mockClear();

    const patched = getExposed(exposed).patchOption({});
    expect(changeSpy).not.toHaveBeenCalled();

    const formatter = getTooltipFormatter(patched, "tooltip");
    const container = formatter(makeTooltipParams(42), "");
    if (!(container instanceof HTMLElement)) {
      throw new Error("Expected tooltip formatter to return an HTMLElement.");
    }

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

    const patched = getExposed(exposed).patchOption({
      toolbox: { feature: {} },
    });
    expect(changeSpy).not.toHaveBeenCalled();

    const toolbox = getToolboxOption(patched);
    const feature = toolbox.feature;
    if (!feature || !feature.dataView) {
      throw new Error("Expected dataView optionToContent to be injected.");
    }
    const optionToContent = feature.dataView.optionToContent;
    if (typeof optionToContent !== "function") {
      throw new Error("Expected dataView optionToContent to be injected.");
    }
    const container = optionToContent({});
    if (!(container instanceof HTMLElement)) {
      throw new Error("Expected dataView optionToContent to return an HTMLElement.");
    }

    await nextTick();
    expect(container.textContent).toBe("data-view");
  });

  it("notifies when slot set changes and cleans state", async () => {
    const changeSpy = vi.fn();
    const showExtra = ref(true);

    const { exposed } = renderSlotComponent(() => {
      const slots: SlotDictionary = {
        tooltip: (...args: unknown[]) => {
          const params = args[0] as { dataIndex: number };
          return [h("span", `tooltip-${params.dataIndex}`)];
        },
      };
      if (showExtra.value) {
        slots["tooltip-extra"] = () => [h("span", "extra")];
      }
      return slots;
    }, changeSpy);

    await nextTick();
    changeSpy.mockClear();

    const patched = getExposed(exposed).patchOption({});
    const formatter = getTooltipFormatter(patched, "tooltip");
    formatter(makeTooltipParams(1), "");
    await nextTick();

    showExtra.value = false;
    await nextTick();

    expect(changeSpy).toHaveBeenCalledTimes(1);

    const patchedAfterRemoval = getExposed(exposed).patchOption({});
    expect("tooltip-extra" in patchedAfterRemoval).toBe(false);
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
      const patched = getExposed(exposed).patchOption({});
      const flattened = warnSpy.mock.calls.flat().join(" ");

      expect(flattened).toContain("[vue-echarts] Invalid slot name: legend");
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

    const patched = getExposed(exposed).patchOption(originalOption);

    expect(patched).not.toBe(originalOption);
    expect(patched.series).not.toBe(originalOption.series);

    const tooltip = getSeriesOption(patched, 0);
    if (typeof tooltip.formatter !== "function") {
      throw new Error("Expected series tooltip formatter to be injected.");
    }
    const container = tooltip.formatter(makeTooltipParams(7), "");
    if (!(container instanceof HTMLElement)) {
      throw new Error("Expected tooltip formatter to return an HTMLElement.");
    }

    await nextTick();
    expect(container.textContent).toBe("series-0");
  });

  it("skips slot patch when path is blocked by non-object", async () => {
    const { exposed } = renderSlotComponent(() => ({
      "tooltip-series-0": () => [h("span", "series-0")],
    }));

    await nextTick();

    const option = { series: 1 } as unknown as Option;
    const patched = getExposed(exposed).patchOption(option);

    expect(patched.series).toBe(1);
    expect(typeof patched.series).toBe("number");
  });

  it("creates array shells when target slot path is missing", async () => {
    const { exposed } = renderSlotComponent(() => ({
      "tooltip-series-1": () => [h("span", "series-1")],
    }));

    await nextTick();

    const patched = getExposed(exposed).patchOption({});
    const tooltip = getSeriesOption(patched, 1);
    if (typeof tooltip.formatter !== "function") {
      throw new Error("Expected series tooltip formatter to be injected.");
    }
    const container = tooltip.formatter(makeTooltipParams(3), "");
    if (!(container instanceof HTMLElement)) {
      throw new Error("Expected tooltip formatter to return an HTMLElement.");
    }

    await nextTick();
    expect(container.textContent).toBe("series-1");
  });
});
