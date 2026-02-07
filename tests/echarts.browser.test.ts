import { describe, it, expect, beforeEach, vi } from "vitest";
import { defineComponent, h, nextTick, provide, ref, shallowRef } from "vue";
import type { Ref, VNodeRef } from "vue";
import { render } from "./helpers/testing";
import { init, enqueueChart, resetECharts, createEChartsModule } from "./helpers/mock";
import type { ChartStub } from "./helpers/mock";
import type {
  EChartsType,
  InitOptions,
  Option,
  SetOptionType,
  Theme,
  UpdateOptions,
} from "../src/types";
import { withConsoleWarn } from "./helpers/dom";
import ECharts, { UPDATE_OPTIONS_KEY } from "../src/ECharts";
import { renderChart } from "./helpers/renderChart";
import type { EChartsElement } from "../src/wc";
import type { ComponentExposed } from "vue-component-type-helpers";

vi.mock("echarts/core", () => createEChartsModule());

let chartStub: ChartStub;

type Exposed = ComponentExposed<typeof ECharts>;

function createExposedRef(exposed: Ref<Exposed | undefined>): VNodeRef {
  return (value) => {
    exposed.value = value ? (value as Exposed) : undefined;
  };
}

function getExposed(exposed: Ref<Exposed | undefined>): Exposed {
  const instance = exposed.value;
  if (!instance) {
    throw new Error("Expected exposed instance to be defined.");
  }
  return instance;
}

function isRefLike(value: unknown): value is { value?: unknown } {
  return typeof value === "object" && value !== null && "value" in value;
}

function getExposedField<T>(exposed: Exposed, key: "chart" | "root"): T | undefined {
  const target = (exposed as Record<"chart" | "root", unknown>)[key];
  return isRefLike(target) ? (target.value as T | undefined) : (target as T | undefined);
}

function setExposedField(exposed: Exposed, key: "chart" | "root", value: unknown): void {
  const target = (exposed as Record<"chart" | "root", unknown>)[key];
  if (isRefLike(target)) {
    target.value = value;
    return;
  }
  (exposed as Record<"chart" | "root", unknown>)[key] = value;
}

beforeEach(() => {
  resetECharts();
  chartStub = enqueueChart();
});

describe("ECharts component", () => {
  it("initializes and reacts to reactive props", async () => {
    const option = ref({ title: { text: "coffee" } });
    const group = ref("group-a");
    const exposed = shallowRef<Exposed>();

    const screen = renderChart(() => ({ option: option.value, group: group.value }), exposed);
    await nextTick();

    expect(init).toHaveBeenCalledTimes(1);
    const [rootEl, theme, initOptions] = init.mock.calls[0];
    expect(rootEl).toBeInstanceOf(HTMLElement);
    expect(theme).toBeNull();
    expect(initOptions).toBeUndefined();

    expect(chartStub.setOption).toHaveBeenCalledTimes(1);
    expect(chartStub.setOption.mock.calls[0][0]).toMatchObject({
      title: { text: "coffee" },
    });
    expect(chartStub.group).toBe("group-a");

    option.value = { title: { text: "latte" } };
    await nextTick();
    expect(chartStub.setOption).toHaveBeenCalledTimes(2);
    expect(chartStub.setOption.mock.calls[1][0]).toMatchObject({
      title: { text: "latte" },
    });

    group.value = "group-b";
    await nextTick();
    expect(chartStub.group).toBe("group-b");

    screen.unmount();
    await nextTick();
    expect(chartStub.dispose).toHaveBeenCalledTimes(1);
  });

  it("exposes setOption for manual updates", async () => {
    const optionRef = ref();
    const exposed = shallowRef<Exposed>();

    renderChart(() => ({ option: optionRef.value, manualUpdate: true }), exposed);
    await nextTick();

    expect(typeof getExposed(exposed).setOption).toBe("function");

    const manualOption = { series: [{ type: "bar", data: [1, 2, 3] }] };
    getExposed(exposed).setOption(manualOption);

    expect(chartStub.setOption).toHaveBeenCalledTimes(1);
    expect(chartStub.setOption.mock.calls[0][0]).toMatchObject(manualOption);
    expect(chartStub.setOption.mock.calls[0][1]).toEqual({});
  });

  it("ignores setOption when manual-update is false", async () => {
    const option = ref({ title: { text: "initial" } });
    const exposed = shallowRef<Exposed>();

    renderChart(() => ({ option: option.value }), exposed);
    await nextTick();

    const initialCalls = chartStub.setOption.mock.calls.length;
    withConsoleWarn((warnSpy) => {
      getExposed(exposed).setOption({ title: { text: "ignored" } }, true);
      expect(chartStub.setOption).toHaveBeenCalledTimes(initialCalls);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "[vue-echarts] `setOption` is only available when `manual-update` is `true`.",
        ),
      );
    });
  });

  it("does not replay manual option after initOptions-triggered reinit", async () => {
    const initOptions = ref<InitOptions>({ renderer: "canvas" });
    const exposed = shallowRef<Exposed>();

    renderChart(() => ({ manualUpdate: true, initOptions: initOptions.value }), exposed);
    await nextTick();

    const manualOption: Option = {
      title: { text: "manual" },
      series: [{ type: "bar", data: [1, 2, 3] }],
    };

    getExposed(exposed).setOption(manualOption);
    expect(chartStub.setOption).toHaveBeenCalledTimes(1);
    expect(chartStub.setOption.mock.calls[0][0]).toMatchObject(manualOption);

    const firstStub = chartStub;
    const replacementStub = enqueueChart();
    chartStub = replacementStub;

    initOptions.value = { renderer: "svg" };
    await nextTick();

    expect(firstStub.dispose).toHaveBeenCalledTimes(1);
    expect(replacementStub.setOption).not.toHaveBeenCalled();
  });

  it("re-initializes manual chart from option prop after reinit", async () => {
    const option = ref<Option>({
      title: { text: "base" },
      series: [{ type: "bar", data: [1] }],
    });
    const initOptions = ref<InitOptions>({ renderer: "canvas" });
    const exposed = shallowRef<Exposed>();

    renderChart(
      () => ({
        option: option.value,
        manualUpdate: true,
        initOptions: initOptions.value,
      }),
      exposed,
    );
    await nextTick();

    expect(chartStub.setOption).toHaveBeenCalledTimes(1);
    expect(chartStub.setOption.mock.calls[0][0]).toMatchObject({
      title: { text: "base" },
    });

    chartStub.setOption.mockClear();

    const manualOption: Option = {
      title: { text: "manual" },
      series: [{ type: "bar", data: [2] }],
    };

    getExposed(exposed).setOption(manualOption);
    expect(chartStub.setOption).toHaveBeenCalledTimes(1);
    expect(chartStub.setOption.mock.calls[0][0]).toMatchObject(manualOption);

    const firstStub = chartStub;
    const replacementStub = enqueueChart();
    chartStub = replacementStub;

    initOptions.value = { renderer: "svg" };
    await nextTick();

    expect(firstStub.dispose).toHaveBeenCalledTimes(1);
    expect(replacementStub.setOption).toHaveBeenCalledTimes(1);
    expect(replacementStub.setOption.mock.calls[0][0]).toMatchObject({
      title: { text: "base" },
    });
  });

  it("passes theme and initOptions props and reacts to theme changes", async () => {
    const option = ref({ title: { text: "brew" } });
    const theme = ref<Theme | undefined>("dark");
    const initOptions = ref({ renderer: "svg" });
    const exposed = shallowRef<Exposed>();

    renderChart(
      () => ({
        option: option.value,
        theme: theme.value,
        initOptions: initOptions.value,
      }),
      exposed,
    );
    await nextTick();

    const [rootEl, passedTheme, passedInit] = init.mock.calls[0];
    expect(rootEl).toBeInstanceOf(HTMLElement);
    expect(passedTheme).toBe("dark");
    expect(passedInit).toEqual({ renderer: "svg" });

    const currentStub = chartStub;
    theme.value = { palette: ["#fff"] };
    await nextTick();
    expect(currentStub.setTheme).toHaveBeenCalledWith({ palette: ["#fff"] });

    theme.value = undefined;
    await nextTick();
    expect(currentStub.setTheme).toHaveBeenCalledWith({});
  });

  it("ignores theme updates when chart ref is missing", async () => {
    const option = ref({ title: { text: "brew" } });
    const theme = ref<Theme | undefined>("dark");
    const exposed = shallowRef<Exposed>();

    renderChart(
      () => ({
        option: option.value,
        theme: theme.value,
      }),
      exposed,
    );
    await nextTick();

    const instance = getExposed(exposed);
    setExposedField(instance, "chart", undefined);

    const callsBefore = chartStub.setTheme.mock.calls.length;
    theme.value = { palette: ["#22d3ee"] };
    await nextTick();

    expect(chartStub.setTheme.mock.calls.length).toBe(callsBefore);
  });

  it("re-initializes when initOptions change", async () => {
    const option = ref({ title: { text: "coffee" } });
    const initOptions = ref({ useDirtyRect: true });
    const exposed = shallowRef<Exposed>();

    renderChart(() => ({ option: option.value, initOptions: initOptions.value }), exposed);
    await nextTick();

    const firstStub = chartStub;
    const secondStub = enqueueChart();
    chartStub = secondStub;

    initOptions.value = { useDirtyRect: false };
    await nextTick();

    expect(firstStub.dispose).toHaveBeenCalledTimes(1);
    expect(init).toHaveBeenCalledTimes(2);
    expect(secondStub.setOption).toHaveBeenCalledTimes(1);
    expect(secondStub.setOption.mock.calls[0][0]).toMatchObject({
      title: { text: "coffee" },
    });
  });

  it("passes updateOptions when provided", async () => {
    const option = ref({ title: { text: "first" } });
    const updateOptions = ref({ notMerge: true, replaceMerge: ["series"] });
    const exposed = shallowRef<Exposed>();

    renderChart(() => ({ option: option.value, updateOptions: updateOptions.value }), exposed);
    await nextTick();

    expect(chartStub.setOption.mock.calls[0][1]).toBe(updateOptions.value);
    chartStub.setOption.mockClear();

    option.value = { title: { text: "second" } };
    await nextTick();

    expect(chartStub.setOption.mock.calls[0][1]).toBe(updateOptions.value);
  });

  it("switches between manual and reactive updates", async () => {
    const option = ref({ title: { text: "initial" } });
    const manualUpdate = ref(true);
    const exposed = shallowRef<Exposed>();
    const firstStub = chartStub;

    renderChart(
      () => ({
        option: option.value,
        manualUpdate: manualUpdate.value,
      }),
      exposed,
    );
    await nextTick();

    expect(firstStub.setOption).toHaveBeenCalledTimes(1);
    expect(firstStub.setOption.mock.calls[0][0]).toMatchObject({
      title: { text: "initial" },
    });

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {
      // noop
    });

    option.value = { title: { text: "manual" } };
    await nextTick();
    expect(firstStub.setOption).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalled();
    expect(warnSpy.mock.calls[0][0]).toContain(
      "[vue-echarts] `option` prop changes are ignored when `manual-update` is `true`.",
    );
    warnSpy.mockClear();

    const replacementStub = enqueueChart();
    manualUpdate.value = false;
    chartStub = replacementStub;
    await nextTick();
    expect(firstStub.dispose).toHaveBeenCalledTimes(1);
    expect(replacementStub.setOption).toHaveBeenCalledTimes(1);
    expect(replacementStub.setOption.mock.calls[0][0]).toMatchObject({
      title: { text: "manual" },
    });

    option.value = { title: { text: "reactive" } };
    await nextTick();

    expect(chartStub.setOption).toHaveBeenCalledTimes(2);
    expect(chartStub.setOption.mock.calls[1][0]).toMatchObject({
      title: { text: "reactive" },
    });

    warnSpy.mockRestore();
  });

  it("uses injected updateOptions defaults when not provided via props", async () => {
    const option = ref({ series: [{ type: "bar", data: [1, 2] }] });
    const defaults = ref<UpdateOptions>({
      lazyUpdate: true,
      replaceMerge: ["dataset"],
    });
    const exposed = shallowRef<Exposed>();

    const Root = defineComponent({
      setup() {
        const setExposed = createExposedRef(exposed);
        provide(UPDATE_OPTIONS_KEY, () => defaults.value);
        return () =>
          h(ECharts, {
            option: option.value,
            ref: setExposed,
          });
      },
    });

    render(Root);

    await nextTick();

    expect(chartStub.setOption.mock.calls[0][1]).toEqual({
      lazyUpdate: true,
      replaceMerge: ["dataset"],
    });

    chartStub.setOption.mockClear();

    defaults.value = { notMerge: true };
    option.value = { series: [{ type: "line", data: [3, 4] }] };
    await nextTick();

    expect(chartStub.setOption.mock.calls[0][1]).toEqual({ notMerge: true });
  });

  it("handles manual setOption when chart instance is missing", async () => {
    const optionRef = ref({ title: { text: "initial" } });
    const exposed = shallowRef<Exposed>();

    renderChart(() => ({ option: optionRef.value, manualUpdate: true }), exposed);
    await nextTick();

    const replacement = enqueueChart();
    const initCallsBefore = init.mock.calls.length;
    setExposedField(getExposed(exposed), "chart", undefined);
    await nextTick();

    const manualOption = { title: { text: "rehydrate" } };
    getExposed(exposed).setOption(manualOption);

    expect(init.mock.calls.length).toBe(initCallsBefore);
    expect(replacement.setOption).not.toHaveBeenCalled();
    expect(getExposedField(getExposed(exposed), "chart")).toBeUndefined();
  });

  it("ignores falsy reactive options", async () => {
    const option = ref<Option | undefined>({ title: { text: "present" } });
    const exposed = shallowRef<Exposed>();

    renderChart(() => ({ option: option.value }), exposed);
    await nextTick();

    const replacementStub = chartStub;
    expect(replacementStub.setOption.mock.calls.length).toBeGreaterThan(0);
    replacementStub.setOption.mockClear();

    option.value = undefined;
    await nextTick();
    await nextTick();

    expect(replacementStub.setOption).not.toHaveBeenCalled();
  });

  it("shows and hides loading based on props", async () => {
    const option = ref({});
    const loading = ref(true);
    const loadingOptions = ref({ text: "Loading" });
    const exposed = shallowRef<Exposed>();

    renderChart(
      () => ({
        option: option.value,
        loading: loading.value,
        loadingOptions: loadingOptions.value,
      }),
      exposed,
    );
    await nextTick();

    expect(chartStub.showLoading).toHaveBeenCalledWith(
      expect.objectContaining({ text: "Loading" }),
    );

    loading.value = false;
    await nextTick();
    expect(chartStub.hideLoading).toHaveBeenCalledTimes(1);
  });

  it("binds chart, zr, and native event listeners", async () => {
    const clickHandler = vi.fn();
    const clickOnce = vi.fn();
    const nativeClick = vi.fn();
    const zrMove = vi.fn();
    const zrOnce = vi.fn();
    const option = ref({});
    const exposed = shallowRef<Exposed>();

    renderChart(
      () => ({
        option: option.value,
        onClick: clickHandler,
        onClickOnce: clickOnce,
        "onNative:click": nativeClick,
        "onZr:mousemoveOnce": zrMove,
        "onZr:clickOnce": zrOnce,
      }),
      exposed,
    );
    await nextTick();

    expect(chartStub.on).toHaveBeenCalledWith("click", expect.any(Function));
    const chartListener = chartStub.on.mock.calls[0][1];
    chartListener("payload");
    expect(clickHandler).toHaveBeenCalledWith("payload");

    const zr = chartStub.getZr();
    expect(zr.on).toHaveBeenCalledWith("mousemove", expect.any(Function));
    const zrListener = zr.on.mock.calls[0][1];
    zrListener("zr-payload");
    expect(zrMove).toHaveBeenCalledWith("zr-payload");
    expect(zr.off).toHaveBeenCalledWith("mousemove", zrListener);

    const chartOnceCall = chartStub.on.mock.calls.find(
      (call) => call[0] === "click" && call[1] !== chartListener,
    );
    if (!chartOnceCall) {
      throw new Error("Expected once click handler to be registered.");
    }
    const chartOnceListener = chartOnceCall[1];
    chartOnceListener("once");
    chartOnceListener("again");
    expect(clickOnce).toHaveBeenCalledTimes(1);
    expect(chartStub.off).toHaveBeenCalledWith("click", chartOnceListener);

    const zrOnceCall = zr.on.mock.calls.find((call) => call[0] === "click");
    if (!zrOnceCall) {
      throw new Error("Expected ZRender once click handler to be registered.");
    }
    const zrOnceListener = zrOnceCall[1];
    zrOnceListener("once");
    zrOnceListener("again");
    expect(zrOnce).toHaveBeenCalledTimes(1);
    expect(zr.off).toHaveBeenCalledWith("click", zrOnceListener);

    await nextTick();
    const rootEl =
      getExposedField<HTMLElement>(getExposed(exposed), "root") ??
      document.querySelector<HTMLElement>("x-vue-echarts");
    if (!rootEl) {
      throw new Error("Expected root element to be available.");
    }
    rootEl.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(nativeClick).toHaveBeenCalledTimes(1);
  });

  it("plans replaceMerge when series id is removed", async () => {
    const option = ref({
      series: [
        { id: "a", type: "bar", data: [1] },
        { id: "b", type: "bar", data: [2] },
      ],
    } satisfies Option);
    const exposed = shallowRef<Exposed>();

    renderChart(() => ({ option: option.value }), exposed);
    await nextTick();
    chartStub.setOption.mockClear();

    // Remove one id to trigger replaceMerge planning
    option.value = {
      series: [{ id: "b", type: "bar", data: [3] }],
    };
    await nextTick();

    expect(chartStub.setOption).toHaveBeenCalledTimes(1);
    const updateOptions = chartStub.setOption.mock.calls[0][1];
    expect(updateOptions).toEqual(expect.objectContaining({ replaceMerge: ["series"] }));
  });

  it("calls resize before commit when autoresize is true", async () => {
    const option = ref({ title: { text: "auto" } });
    const exposed = shallowRef<Exposed>();

    renderChart(() => ({ option: option.value, autoresize: true }), exposed);
    await nextTick();

    expect(chartStub.resize).toHaveBeenCalled();
  });

  it("supports boolean notMerge in manual setOption", async () => {
    const option = ref({ title: { text: "manual" } });
    const exposed = shallowRef<Exposed>();

    renderChart(() => ({ option: option.value, manualUpdate: true }), exposed);
    await nextTick();

    chartStub.setOption.mockClear();
    getExposed(exposed).setOption({ title: { text: "b" } }, true, false);

    expect(chartStub.setOption).toHaveBeenCalledTimes(1);
    const updateOptions = chartStub.setOption.mock.calls[0][1];
    expect(updateOptions).toEqual({ notMerge: true, lazyUpdate: false });
  });

  it("sets notMerge when options array shrinks", async () => {
    const option = ref({ options: [{}, {}] } satisfies Option);
    const exposed = shallowRef<Exposed>();

    renderChart(() => ({ option: option.value }), exposed);
    await nextTick();

    chartStub.setOption.mockClear();
    option.value = { options: [{}] };
    await nextTick();

    const updateOptions = chartStub.setOption.mock.calls[0][1];
    expect(updateOptions).toEqual(expect.objectContaining({ notMerge: true }));
  });

  it("does not re-initialize when calling setOption with an existing instance (manual)", async () => {
    const option = ref({ title: { text: "init-manual" } });
    const exposed = shallowRef<Exposed>();

    renderChart(() => ({ option: option.value, manualUpdate: true }), exposed);

    init.mockClear();
    chartStub.setOption.mockClear();

    getExposed(exposed).setOption({ title: { text: "after" } });
    await nextTick();

    expect(init).not.toHaveBeenCalled();
    expect(chartStub.setOption).toHaveBeenCalledTimes(1);
  });

  it("applies option reactively without re-initialization when option becomes defined", async () => {
    const option = ref<Option | null>(null);
    const exposed = shallowRef<Exposed>();

    renderChart(() => ({ option: option.value }), exposed);
    init.mockClear();
    chartStub.setOption.mockClear();

    option.value = { title: { text: "now-defined" } };
    await nextTick();

    expect(init).not.toHaveBeenCalled();
    expect(chartStub.setOption).toHaveBeenCalledTimes(1);
  });

  it("applies option when nested data mutates", async () => {
    const option = ref({
      series: [{ type: "bar", data: [1, 2, 3] }],
    } satisfies Option);
    const exposed = shallowRef<Exposed>();

    renderChart(() => ({ option: option.value }), exposed);
    await nextTick();

    chartStub.setOption.mockClear();

    option.value.series[0].data.push(4);
    await nextTick();

    expect(chartStub.setOption).toHaveBeenCalledTimes(1);
    expect(chartStub.setOption.mock.calls[0][0]).toMatchObject({
      series: [{ data: [1, 2, 3, 4] }],
    });
  });

  it("honors override.replaceMerge in update options", async () => {
    const option = ref({ series: [{ type: "bar", data: [1] }] });
    const exposed = shallowRef<Exposed>();

    renderChart(() => ({ option: option.value, manualUpdate: true }), exposed);
    await nextTick();

    chartStub.setOption.mockClear();
    const override: UpdateOptions = { replaceMerge: ["series"] };
    getExposed(exposed).setOption({ series: [{ type: "bar", data: [2] }] }, override);

    expect(chartStub.setOption).toHaveBeenCalledTimes(1);
    const updateOptions = chartStub.setOption.mock.calls[0][1];
    expect(updateOptions).toEqual(expect.objectContaining({ replaceMerge: ["series"] }));
  });

  it("sets __dispose on root during unmount when wcRegistered and cleanup runs via disconnectedCallback", async () => {
    const option = ref({ title: { text: "wc-dispose" } });
    const exposed = shallowRef<Exposed>();

    const screen = renderChart(() => ({ option: option.value }), exposed);
    await nextTick();

    const el =
      getExposedField<EChartsElement>(getExposed(exposed), "root") ??
      document.querySelector<EChartsElement>("x-vue-echarts");
    if (!el) {
      throw new Error("Expected root element to be available.");
    }
    expect(el).toBeInstanceOf(HTMLElement);
    chartStub.dispose.mockClear();

    // Unmount triggers custom element disconnectedCallback, which invokes __dispose immediately
    screen.unmount();
    await nextTick();

    expect(chartStub.dispose).toHaveBeenCalledTimes(1);
    // wc disconnectedCallback should null out the hook after calling it
    expect(el.__dispose).toBeNull();
  });

  it("setOption after unmount is a safe no-op (manual)", async () => {
    const option = ref({ title: { text: "mounted" } });
    const exposed = shallowRef<Exposed>();

    const screen = renderChart(() => ({ option: option.value, manualUpdate: true }), exposed);
    await nextTick();

    const callsBefore = chartStub.setOption.mock.calls.length;

    // Capture the function reference before unmount; template ref becomes null on unmount
    const callSetOption: SetOptionType = getExposed(exposed).setOption;

    // Unmount disposes and clears chart.value internally
    screen.unmount();
    await nextTick();

    // Calling setOption after unmount should be a no-op and not throw
    expect(() => callSetOption({ title: { text: "after" } })).not.toThrow();

    expect(chartStub.setOption.mock.calls.length).toBe(callsBefore);
  });

  it("re-applies option when slot set changes (auto mode)", async () => {
    const option = ref({ title: { text: "with-slots" } });
    const showExtra = ref(true);
    const exposed = shallowRef<Exposed>();

    const Root = defineComponent({
      setup() {
        const setExposed = createExposedRef(exposed);
        return () =>
          h(
            ECharts,
            {
              option: option.value,
              ref: setExposed,
            },
            showExtra.value
              ? {
                  tooltip: () => [h("span", "t")],
                  "tooltip-extra": () => [h("span", "x")],
                }
              : {
                  tooltip: () => [h("span", "t")],
                },
          );
      },
    });

    render(Root);
    await nextTick();

    // One initial setOption from mount
    const initialCalls = chartStub.setOption.mock.calls.length;

    // Changing slot set triggers useSlotOption onChange, which applies current option again
    showExtra.value = false;
    await nextTick();
    await nextTick();

    expect(chartStub.setOption.mock.calls.length).toBeGreaterThan(initialCalls);
  });

  it("does not re-apply option on slot change in manual-update mode", async () => {
    const option = ref({ title: { text: "manual-slots" } });
    const showExtra = ref(true);
    const exposed = shallowRef<Exposed>();

    const Root = defineComponent({
      setup() {
        const setExposed = createExposedRef(exposed);
        return () =>
          h(
            ECharts,
            {
              option: option.value,
              manualUpdate: true,
              ref: setExposed,
            },
            showExtra.value
              ? {
                  tooltip: () => [h("span", "t")],
                  "tooltip-extra": () => [h("span", "x")],
                }
              : {
                  tooltip: () => [h("span", "t")],
                },
          );
      },
    });

    render(Root);
    await nextTick();

    const initialCalls = chartStub.setOption.mock.calls.length;

    showExtra.value = false;
    await nextTick();
    await nextTick();

    expect(chartStub.setOption.mock.calls.length).toBe(initialCalls);
  });

  it("skips resize when instance is disposed in autoresize path", async () => {
    const option = ref({});
    const exposed = shallowRef<Exposed>();

    // Force the disposed branch in resize()
    chartStub.isDisposed.mockReturnValue(true);

    renderChart(() => ({ option: option.value, autoresize: true }), exposed);
    await nextTick();

    // resize should be skipped, commit should still apply option
    expect(chartStub.resize).not.toHaveBeenCalled();
    expect(chartStub.setOption).toHaveBeenCalled();
  });

  it("stops reactive updates after toggling manualUpdate to true", async () => {
    const option = ref({ title: { text: "start" } });
    const manual = ref(false);
    const exposed = shallowRef<Exposed>();

    renderChart(() => ({ option: option.value, manualUpdate: manual.value }), exposed);
    await nextTick();

    chartStub.setOption.mockClear();
    option.value = { title: { text: "reactive-1" } };
    await nextTick();
    expect(chartStub.setOption).toHaveBeenCalledTimes(1);

    // Toggle to manual mode; watcher should be cleaned up (unwatchOption branch)
    const firstStub = chartStub;
    const replacementStub = enqueueChart();
    manual.value = true;
    chartStub = replacementStub;
    await nextTick();
    expect(firstStub.dispose).toHaveBeenCalledTimes(1);
    expect(replacementStub.setOption).toHaveBeenCalledTimes(1);
    chartStub.setOption.mockClear();

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {
      // noop
    });

    chartStub.setOption.mockClear();
    option.value = { title: { text: "reactive-2" } };
    await nextTick();
    expect(chartStub.setOption).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    expect(warnSpy.mock.calls[0][0]).toContain(
      "[vue-echarts] `option` prop changes are ignored when `manual-update` is `true`.",
    );

    warnSpy.mockRestore();
  });

  it("ignores falsy listeners during event binding", async () => {
    const option = ref({});
    const exposed = shallowRef<Exposed>();

    renderChart(() => ({ option: option.value, onClick: undefined }), exposed);
    await nextTick();

    expect(chartStub.on).not.toHaveBeenCalled();
  });

  it("skips option watcher when chart instance is missing", async () => {
    const option = ref<Option | null>(null);
    const exposed = shallowRef<Exposed>();

    init.mockImplementation(() => undefined as unknown as EChartsType);

    renderChart(() => ({ option: option.value }), exposed);
    await nextTick();

    chartStub.setOption.mockClear();

    option.value = { title: { text: "later" } };
    await nextTick();

    expect(chartStub.setOption).not.toHaveBeenCalled();
  });

  it("skips dispose when cleanup runs without a chart instance", async () => {
    const option = ref({ title: { text: "missing-instance" } });
    const manualUpdate = ref(false);
    const exposed = shallowRef<Exposed>();

    renderChart(() => ({ option: option.value, manualUpdate: manualUpdate.value }), exposed);
    await nextTick();

    chartStub.dispose.mockClear();
    setExposedField(getExposed(exposed), "chart", undefined);

    const replacementStub = enqueueChart();
    manualUpdate.value = true;
    await nextTick();

    expect(chartStub.dispose).not.toHaveBeenCalled();
    expect(replacementStub.setOption).toHaveBeenCalledTimes(1);
  });

  it("falls back to direct cleanup when root ref is missing on unmount", async () => {
    const option = ref({ title: { text: "missing-root" } });
    const exposed = shallowRef<Exposed>();

    const screen = renderChart(() => ({ option: option.value }), exposed);
    await nextTick();

    chartStub.dispose.mockClear();
    setExposedField(getExposed(exposed), "root", undefined);

    screen.unmount();
    await nextTick();

    expect(chartStub.dispose).toHaveBeenCalledTimes(1);
  });

  it("calls cleanup directly when web component registration fails", async () => {
    vi.resetModules();

    vi.doMock("../src/wc", () => ({
      TAG_NAME: "x-vue-echarts",
      register: () => false,
    }));

    const { default: LocalECharts } = await import("../src/ECharts");

    const exposed = shallowRef<Exposed>();
    const Root = defineComponent({
      setup() {
        const setExposed = createExposedRef(exposed);
        return () =>
          h(LocalECharts, {
            option: { title: { text: "no-wc" } },
            ref: setExposed,
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
