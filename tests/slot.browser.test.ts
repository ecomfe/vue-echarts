import { describe, it, expect, vi } from "vitest";
import { createApp, defineComponent, h, nextTick, ref, shallowRef, watchEffect } from "vue";
import type { PropType, Ref, VNodeChild, VNodeRef } from "vue";
import { render } from "./helpers/testing";
import { makeTooltipParams } from "./helpers/tooltip";

import { useSlotOption } from "../src/composables/slot";
import { createFrame, withConsoleWarnAsync } from "./helpers/dom";
import type { Option } from "../src/types";
import type {
  ToolboxComponentOption,
  TooltipComponentFormatterCallbackParams,
  TooltipComponentFormatterCallback,
  TooltipComponentOption,
} from "echarts";

type SlotTestHandle = ReturnType<typeof useSlotOption> & {
  setReady: (value: boolean) => void;
};

const SlotTestComponent = defineComponent({
  props: {
    onChange: {
      type: Function as PropType<() => void>,
      default: undefined,
    },
  },
  setup(props, ctx) {
    const ready = shallowRef(true);
    const { render, patchOption, commitOption } = useSlotOption(
      ctx.slots,
      props.onChange ?? (() => {}),
      ready,
    );

    ctx.expose({
      patchOption,
      commitOption,
      render,
      setReady: (value: boolean) => {
        ready.value = value;
      },
    });

    return () => h("div", render());
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
  return typeof value === "object" && value !== null && "patchOption" in value && "render" in value;
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

function getTooltipFormatter(option: Option, label: string): TooltipFormatter {
  const tooltip = (
    option as {
      tooltip?: TooltipComponentOption | TooltipComponentOption[];
    }
  ).tooltip;
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

function getDataViewFormatter(option: Option) {
  const formatter = getToolboxOption(option).feature?.dataView?.optionToContent;
  if (typeof formatter !== "function") {
    throw new Error("Expected dataView optionToContent to be injected.");
  }
  return formatter;
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
  it("returns the original option when no callback slots exist", async () => {
    const { exposed } = renderSlotComponent(() => ({}));
    const option = { series: [{ type: "line", data: [1, 2, 3] }] };

    await nextTick();

    expect(getExposed(exposed).patchOption(option)).toBe(option);
  });

  it("creates callback containers in the component owner document", async () => {
    const { iframe, ownerDocument, ownerWindow } = createFrame();
    const container = ownerDocument.body.appendChild(ownerDocument.createElement("div"));
    const exposed = shallowRef<SlotTestHandle>();
    const Root = defineComponent({
      setup() {
        return () =>
          h(
            SlotTestComponent,
            {
              ref: (value) => {
                exposed.value = isSlotTestHandle(value) ? value : undefined;
              },
            },
            { tooltip: () => h("span", "iframe-tooltip") },
          );
      },
    });
    const app = createApp(Root);

    try {
      app.mount(container);
      await nextTick();

      const option = ownerWindow.JSON.parse('{"tooltip":{"show":true}}') as Option;
      const patched = getExposed(exposed).patchOption(option);
      const tooltipContainer = getTooltipFormatter(patched, "iframe")(makeTooltipParams(0), "");
      const element = tooltipContainer as HTMLElement | undefined;

      expect(element?.ownerDocument).toBe(ownerDocument);
      await nextTick();
      expect(element?.textContent).toBe("iframe-tooltip");
    } finally {
      app.unmount();
      iframe.remove();
    }
  });

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
    const params = makeTooltipParams(42);
    const container = formatter(params, "");
    if (!(container instanceof HTMLElement)) {
      throw new Error("Expected tooltip formatter to return an HTMLElement.");
    }

    await nextTick();
    expect(container.textContent).toBe("tooltip-42");

    params.dataIndex = 43;
    expect(formatter(params, "")).toBe(container);
    await nextTick();
    expect(container.textContent).toBe("tooltip-43");
  });

  it("releases callback containers while the chart is not ready", async () => {
    const tooltip = vi.fn(() => h("span", "tooltip"));
    const { exposed } = renderSlotComponent(() => ({ tooltip }));

    await nextTick();

    const handle = getExposed(exposed);
    const formatter = getTooltipFormatter(handle.patchOption({}), "tooltip");
    const container = formatter(makeTooltipParams(0), "");
    expect(container).toBeInstanceOf(HTMLElement);
    await nextTick();
    tooltip.mockClear();

    handle.setReady(false);
    await nextTick();

    expect(formatter(makeTooltipParams(1), "")).toBeUndefined();

    handle.setReady(true);
    await nextTick();
    expect(tooltip).not.toHaveBeenCalled();

    const nextContainer = formatter(makeTooltipParams(2), "");
    expect(nextContainer).toBeInstanceOf(HTMLElement);
    expect(nextContainer).not.toBe(container);
    await nextTick();
    expect(tooltip).toHaveBeenCalledOnce();
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

    const optionToContent = getDataViewFormatter(patched);
    const container = optionToContent({});
    if (!(container instanceof HTMLElement)) {
      throw new Error("Expected dataView optionToContent to return an HTMLElement.");
    }

    await nextTick();
    expect(container.textContent).toBe("data-view");
  });

  it("patches repeatable callback components by index", async () => {
    const { exposed } = renderSlotComponent(() => ({
      "tooltip-0": () => null,
      "tooltip-0-media-1-option": () => null,
      "dataView-1": () => null,
    }));

    await nextTick();

    const patched = getExposed(exposed).patchOption({
      tooltip: [{}, {}],
      toolbox: [{}, { feature: {} }],
      media: [{ option: {} }, { option: { tooltip: [{}] } }],
    });
    const tooltip = (patched.tooltip as TooltipComponentOption[])[0];
    const nestedTooltip = (
      patched.media as Array<{ option?: { tooltip?: TooltipComponentOption[] } }>
    )[1].option?.tooltip?.[0];
    const dataView = (patched.toolbox as ToolboxComponentOption[])[1].feature?.dataView;

    expect(tooltip.formatter).toBeTypeOf("function");
    expect(nestedTooltip?.formatter).toBeTypeOf("function");
    expect(dataView?.optionToContent).toBeTypeOf("function");
  });

  it("uses the latest slot when an existing formatter runs", async () => {
    const changeSpy = vi.fn();
    const tooltipSlot = shallowRef(() => [h("span", "first")]);
    const { exposed } = renderSlotComponent(() => ({ tooltip: tooltipSlot.value }), changeSpy);

    await nextTick();

    const formatter = getTooltipFormatter(getExposed(exposed).patchOption({}), "tooltip");

    const container = formatter(makeTooltipParams(0), "");
    if (!(container instanceof HTMLElement)) {
      throw new Error("Expected tooltip formatter to return an HTMLElement.");
    }
    tooltipSlot.value = () => [h("span", "second")];
    await nextTick();

    expect(changeSpy).not.toHaveBeenCalled();
    formatter(makeTooltipParams(1), "");
    await nextTick();
    expect(container.textContent).toBe("second");
  });

  it("rebuilds when a slot name changes without changing the slot count", async () => {
    const changeSpy = vi.fn();
    const extraName = ref<"tooltip-extra" | "tooltip-next">("tooltip-extra");

    const { exposed } = renderSlotComponent(
      () => ({ [extraName.value]: () => [h("span", "extra")] }),
      changeSpy,
    );

    await nextTick();
    changeSpy.mockClear();

    extraName.value = "tooltip-next";
    await nextTick();

    expect(changeSpy).toHaveBeenCalledOnce();
    expect(changeSpy).toHaveBeenCalledWith();

    const patchedAfterRemoval = getExposed(exposed).patchOption({});
    expect(patchedAfterRemoval).not.toHaveProperty("extra");
    expect(patchedAfterRemoval).toHaveProperty("next.tooltip.formatter", expect.any(Function));
  });

  it("ignores slot declaration order changes", async () => {
    const changeSpy = vi.fn();
    const reversed = ref(false);
    const tooltip = () => [h("span", "root")];
    const nested = () => [h("span", "series")];
    renderSlotComponent(
      () =>
        reversed.value
          ? { "tooltip-series-0": nested, tooltip }
          : { tooltip, "tooltip-series-0": nested },
      changeSpy,
    );

    await nextTick();
    changeSpy.mockClear();

    reversed.value = true;
    await nextTick();

    expect(changeSpy).not.toHaveBeenCalled();
  });

  it("cleans formatter containers when dynamic tooltip/dataView slot paths are removed", async () => {
    const changeSpy = vi.fn();
    const showNested = ref(true);
    const tooltipSlot = vi.fn(() => [h("span", "nested-tooltip")]);

    const { exposed } = renderSlotComponent(() => {
      const slots: SlotDictionary = {};
      if (showNested.value) {
        slots["tooltip-series-0"] = tooltipSlot;
        slots["dataView-panel"] = () => [h("span", "nested-data-view")];
      }
      return slots;
    }, changeSpy);

    await nextTick();
    changeSpy.mockClear();

    const patched = getExposed(exposed).patchOption({});
    const tooltip = getSeriesOption(patched, 0);
    if (typeof tooltip.formatter !== "function") {
      throw new Error("Expected nested series tooltip formatter to be injected.");
    }

    const tooltipContainer = tooltip.formatter(makeTooltipParams(9), "");
    if (!(tooltipContainer instanceof HTMLElement)) {
      throw new Error("Expected nested tooltip formatter to return an HTMLElement.");
    }

    const panel = (patched as Record<string, unknown>).panel as
      | {
          toolbox?: { feature?: { dataView?: { optionToContent?: (option: unknown) => unknown } } };
        }
      | undefined;
    const optionToContent = panel?.toolbox?.feature?.dataView?.optionToContent;
    if (typeof optionToContent !== "function") {
      throw new Error("Expected nested dataView optionToContent to be injected.");
    }
    const dataViewContainer = optionToContent({});
    if (!(dataViewContainer instanceof HTMLElement)) {
      throw new Error("Expected nested dataView optionToContent to return an HTMLElement.");
    }

    await nextTick();
    expect(tooltipContainer.textContent).toBe("nested-tooltip");
    expect(dataViewContainer.textContent).toBe("nested-data-view");

    showNested.value = false;
    await nextTick();

    expect(changeSpy).toHaveBeenCalledTimes(1);
    tooltipSlot.mockClear();
    expect(tooltip.formatter(makeTooltipParams(10), "")).toBeUndefined();
    expect(optionToContent({})).toBeUndefined();
    const patchedAfterRemoval = getExposed(exposed).patchOption({});
    expect(patchedAfterRemoval.series).toBeUndefined();
    expect((patchedAfterRemoval as Record<string, unknown>).panel).toBeUndefined();

    showNested.value = true;
    await nextTick();
    expect(tooltipSlot).not.toHaveBeenCalled();
  });

  it("clears a removed callback without replacing a source callback", async () => {
    const visible = ref(true);
    const { exposed } = renderSlotComponent(() => {
      const slots: SlotDictionary = {};
      if (visible.value) {
        slots.tooltip = () => h("span", "tooltip");
      }
      return slots;
    });

    await nextTick();
    const handle = getExposed(exposed);
    handle.patchOption({});
    handle.commitOption();

    visible.value = false;
    await nextTick();
    expect(handle.patchOption({})).toHaveProperty("tooltip.formatter", null);

    const formatter = vi.fn();
    expect(handle.patchOption({ tooltip: { formatter } })).toHaveProperty(
      "tooltip.formatter",
      formatter,
    );
  });

  it("warns and skips invalid slot names", async () => {
    const changeSpy = vi.fn();
    await withConsoleWarnAsync(async (warnSpy) => {
      const { exposed } = renderSlotComponent(
        () => ({
          legend: () => [h("span", "legend")],
          "tooltip-": () => [h("span", "empty-tooltip-path")],
          "tooltip-__proto__": () => [h("span", "prototype-path")],
          "dataView-panel--0": () => [h("span", "empty-data-view-path")],
        }),
        changeSpy,
      );

      await nextTick();
      const flattened = warnSpy.mock.calls.flat().join(" ");

      expect(flattened).toContain("[vue-echarts] Invalid slot name: legend");
      expect(flattened).toContain("[vue-echarts] Invalid slot name: tooltip-");
      expect(flattened).toContain("[vue-echarts] Invalid slot name: tooltip-__proto__");
      expect(flattened).toContain("[vue-echarts] Invalid slot name: dataView-panel--0");

      warnSpy.mockClear();
      changeSpy.mockClear();
      const patched = getExposed(exposed).patchOption({});

      expect(warnSpy).not.toHaveBeenCalled();
      expect(patched).toEqual({});
      expect(Object.getPrototypeOf(patched)).toBe(Object.prototype);
      expect(changeSpy).not.toHaveBeenCalled();
    });
  });

  it("warns once when an invalid slot is added dynamically", async () => {
    const changeSpy = vi.fn();
    const slots = shallowRef<SlotDictionary>({});

    renderSlotComponent(() => slots.value, changeSpy);
    await nextTick();

    await withConsoleWarnAsync(async (warnSpy) => {
      slots.value = { legend: () => h("span", "legend") };
      await nextTick();
      slots.value = {};
      await nextTick();
      slots.value = { legend: () => h("span", "legend") };
      await nextTick();

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls.flat().join(" ")).toContain(
        "[vue-echarts] Invalid slot name: legend",
      );
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
    const visible = ref(true);
    const { exposed } = renderSlotComponent(() => {
      const slots: SlotDictionary = {};
      if (visible.value) {
        slots["tooltip-series-0"] = () => [h("span", "series-0")];
      }
      return slots;
    });

    await nextTick();

    const option = { series: 1 } as unknown as Option;
    const handle = getExposed(exposed);
    const patched = handle.patchOption(option);

    expect(patched.series).toBe(1);
    expect(typeof patched.series).toBe("number");

    visible.value = false;
    await nextTick();
    handle.patchOption(option);
  });

  it("does not cross object and array path segments", async () => {
    const { exposed } = renderSlotComponent(() => ({
      tooltip: () => [h("span", "invalid")],
      "tooltip-series-name": () => [h("span", "invalid")],
      "dataView-0": () => [h("span", "invalid")],
    }));

    await nextTick();

    const patched = getExposed(exposed).patchOption({
      tooltip: [],
      series: [],
      toolbox: { id: "main" },
    } as unknown as Option);

    expect(Object.keys(patched.tooltip as unknown[])).toEqual([]);
    expect(Object.keys(patched.series as unknown[])).toEqual([]);
    expect(patched.toolbox).toEqual({ id: "main" });
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
