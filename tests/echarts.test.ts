import { describe, it, expect, beforeEach, vi } from "vitest";
import { defineComponent, h, nextTick, provide, ref, shallowRef } from "vue";
import { render } from "./helpers/testing";
import {
  init,
  enqueueChart,
  resetECharts,
  type ChartStub,
} from "./helpers/mock";
import type { InitOptions, Option, UpdateOptions } from "../src/types";
import { withConsoleWarn } from "./helpers/dom";
import ECharts, { UPDATE_OPTIONS_KEY } from "../src/ECharts";
import { renderChart } from "./helpers/renderChart";

let chartStub: ChartStub;

beforeEach(() => {
  resetECharts();
  chartStub = enqueueChart();
});

describe("ECharts component", () => {
  it("initializes and reacts to reactive props", async () => {
    const option = ref({ title: { text: "coffee" } });
    const group = ref("group-a");
    const exposed = shallowRef<any>();

    const screen = renderChart(
      () => ({ option: option.value, group: group.value }),
      exposed,
    );
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
    const exposed = shallowRef<any>();

    renderChart(
      () => ({ option: optionRef.value, manualUpdate: true }),
      exposed,
    );
    await nextTick();

    expect(typeof exposed.value?.setOption).toBe("function");

    const manualOption = { series: [{ type: "bar", data: [1, 2, 3] }] };
    exposed.value.setOption(manualOption);

    expect(chartStub.setOption).toHaveBeenCalledTimes(1);
    expect(chartStub.setOption.mock.calls[0][0]).toMatchObject(manualOption);
    expect(chartStub.setOption.mock.calls[0][1]).toEqual({});
  });

  it("ignores setOption when manual-update is false", async () => {
    const option = ref({ title: { text: "initial" } });
    const exposed = shallowRef<any>();

    renderChart(() => ({ option: option.value }), exposed);
    await nextTick();

    const initialCalls = chartStub.setOption.mock.calls.length;
    withConsoleWarn((warnSpy) => {
      exposed.value.setOption({ title: { text: "ignored" } }, true);
      expect(chartStub.setOption).toHaveBeenCalledTimes(initialCalls);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "[vue-echarts] `setOption` is only available when `manual-update` is `true`.",
        ),
      );
    });
  });

  it("warns when option prop changes in manual-update mode", async () => {
    const option = ref({ title: { text: "initial" } });
    const exposed = shallowRef<any>();

    renderChart(() => ({ option: option.value, manualUpdate: true }), exposed);
    await nextTick();

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {
      // noop
    });

    option.value = { title: { text: "next" } };
    await nextTick();

    expect(warnSpy).toHaveBeenCalled();
    expect(warnSpy.mock.calls[0][0]).toContain(
      "[vue-echarts] `option` prop changes are ignored when `manual-update` is `true`.",
    );

    warnSpy.mockRestore();
  });

  it("does not replay manual option after initOptions-triggered reinit", async () => {
    const initOptions = ref<InitOptions>({ renderer: "canvas" });
    const exposed = shallowRef<any>();

    renderChart(
      () => ({ manualUpdate: true, initOptions: initOptions.value }),
      exposed,
    );
    await nextTick();

    const manualOption: Option = {
      title: { text: "manual" },
      series: [{ type: "bar", data: [1, 2, 3] }],
    };

    exposed.value.setOption(manualOption);
    expect(chartStub.setOption).toHaveBeenCalledTimes(1);
    expect(chartStub.setOption.mock.calls[0][0]).toMatchObject(manualOption);

    const firstStub = chartStub;
    const replacementStub = enqueueChart();
    chartStub = replacementStub;

    initOptions.value = { renderer: "svg" as const };
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
    const exposed = shallowRef<any>();

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

    exposed.value.setOption(manualOption);
    expect(chartStub.setOption).toHaveBeenCalledTimes(1);
    expect(chartStub.setOption.mock.calls[0][0]).toMatchObject(manualOption);

    const firstStub = chartStub;
    const replacementStub = enqueueChart();
    chartStub = replacementStub;

    initOptions.value = { renderer: "svg" as const };
    await nextTick();

    expect(firstStub.dispose).toHaveBeenCalledTimes(1);
    expect(replacementStub.setOption).toHaveBeenCalledTimes(1);
    expect(replacementStub.setOption.mock.calls[0][0]).toMatchObject({
      title: { text: "base" },
    });
  });

  it("passes theme and initOptions props and reacts to theme changes", async () => {
    const option = ref({ title: { text: "brew" } });
    const theme = ref("dark");
    const initOptions = ref({ renderer: "svg" });
    const exposed = shallowRef<any>();

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
    theme.value = { palette: ["#fff"] } as any;
    await nextTick();
    expect(currentStub.setTheme).toHaveBeenCalledWith({ palette: ["#fff"] });
  });

  it("re-initializes when initOptions change", async () => {
    const option = ref({ title: { text: "coffee" } });
    const initOptions = ref({ useDirtyRect: true });
    const exposed = shallowRef<any>();

    renderChart(
      () => ({ option: option.value, initOptions: initOptions.value }),
      exposed,
    );
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
    const exposed = shallowRef<any>();

    renderChart(
      () => ({ option: option.value, updateOptions: updateOptions.value }),
      exposed,
    );
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
    const exposed = shallowRef<any>();
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
    const exposed = shallowRef<any>();

    const Root = defineComponent({
      setup() {
        provide(UPDATE_OPTIONS_KEY, () => defaults.value);
        return () =>
          h(ECharts, {
            option: option.value,
            ref: (value: unknown) => {
              exposed.value = value;
            },
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
    const exposed = shallowRef<any>();

    renderChart(
      () => ({ option: optionRef.value, manualUpdate: true }),
      exposed,
    );
    await nextTick();

    const replacement = enqueueChart();
    const initCallsBefore = init.mock.calls.length;
    exposed.value.chart.value = undefined;
    await nextTick();

    const manualOption = { title: { text: "rehydrate" } };
    exposed.value.setOption(manualOption);

    expect(init.mock.calls.length).toBe(initCallsBefore);
    expect(replacement.setOption).not.toHaveBeenCalled();
    expect(exposed.value.chart.value).toBeUndefined();
  });

  it("ignores falsy reactive options", async () => {
    const option = ref({ title: { text: "present" } });
    const exposed = shallowRef<any>();

    renderChart(() => ({ option: option.value }), exposed);
    await nextTick();

    const replacementStub = chartStub;
    expect(replacementStub.setOption.mock.calls.length).toBeGreaterThan(0);
    replacementStub.setOption.mockClear();

    option.value = undefined as any;
    await nextTick();
    await nextTick();

    expect(replacementStub.setOption).not.toHaveBeenCalled();
  });

  it("disposes chart on unmount when root element is unavailable", async () => {
    const option = ref({ title: { text: "cleanup" } });
    const exposed = shallowRef<any>();

    const screen = renderChart(() => ({ option: option.value }), exposed);
    await nextTick();

    chartStub.dispose.mockClear();
    Object.defineProperty(exposed.value.root, "value", {
      configurable: true,
      get: () => undefined,
      set: () => {
        /* ignore */
      },
    });

    screen.unmount();
    await nextTick();

    expect(chartStub.dispose).toHaveBeenCalledTimes(1);
  });

  it("shows and hides loading based on props", async () => {
    const option = ref({});
    const loading = ref(true);
    const loadingOptions = ref({ text: "Loading" });
    const exposed = shallowRef<any>();

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
    const nativeClick = vi.fn();
    const zrMove = vi.fn();
    const option = ref({});
    const exposed = shallowRef<any>();

    renderChart(
      () => ({
        option: option.value,
        onClick: clickHandler,
        "onNative:click": nativeClick,
        "onZr:mousemoveOnce": zrMove,
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

    await nextTick();
    const rootEl =
      (exposed.value?.root?.value as HTMLElement | undefined) ??
      (document.querySelector("x-vue-echarts") as HTMLElement | null);
    expect(rootEl).toBeInstanceOf(HTMLElement);
    rootEl!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(nativeClick).toHaveBeenCalledTimes(1);
  });

  it("removes once listeners after first invocation", async () => {
    const clickOnce = vi.fn();
    const zrOnce = vi.fn();
    const option = ref({});
    const exposed = shallowRef<any>();

    renderChart(
      () => ({
        option: option.value,
        onClickOnce: clickOnce,
        "onZr:clickOnce": zrOnce,
      }),
      exposed,
    );
    await nextTick();

    const chartCall = chartStub.on.mock.calls.find(
      (call: any[]) => call[0] === "click",
    );
    expect(chartCall).toBeTruthy();
    const chartListener = chartCall?.[1];

    chartListener?.("payload");
    chartListener?.("again");
    expect(clickOnce).toHaveBeenCalledTimes(1);
    expect(chartStub.off).toHaveBeenCalledWith("click", chartListener);

    const zr = chartStub.getZr();
    const zrCall = zr.on.mock.calls.find((call: any[]) => call[0] === "click");
    expect(zrCall).toBeTruthy();
    const zrListener = zrCall?.[1];

    zrListener?.("zr");
    zrListener?.("zr-again");
    expect(zrOnce).toHaveBeenCalledTimes(1);
    expect(zr.off).toHaveBeenCalledWith("click", zrListener);
  });

  it("plans replaceMerge when series id is removed", async () => {
    const option = ref({
      series: [
        { id: "a", type: "bar", data: [1] },
        { id: "b", type: "bar", data: [2] },
      ],
    });
    const exposed = shallowRef<any>();

    renderChart(() => ({ option: option.value }), exposed);
    await nextTick();
    chartStub.setOption.mockClear();

    // Remove one id to trigger replaceMerge planning
    option.value = {
      series: [{ id: "b", type: "bar", data: [3] }],
    } as any;
    await nextTick();

    expect(chartStub.setOption).toHaveBeenCalledTimes(1);
    const updateOptions = chartStub.setOption.mock.calls[0][1];
    expect(updateOptions).toEqual(
      expect.objectContaining({ replaceMerge: ["series"] }),
    );
  });

  it("calls resize before commit when autoresize is true", async () => {
    const option = ref({ title: { text: "auto" } });
    const exposed = shallowRef<any>();

    renderChart(() => ({ option: option.value, autoresize: true }), exposed);
    await nextTick();

    expect(chartStub.resize).toHaveBeenCalled();
  });

  it("supports boolean notMerge in manual setOption", async () => {
    const option = ref({ title: { text: "manual" } });
    const exposed = shallowRef<any>();

    renderChart(() => ({ option: option.value, manualUpdate: true }), exposed);
    await nextTick();

    chartStub.setOption.mockClear();
    exposed.value.setOption({ title: { text: "b" } }, true, false);

    expect(chartStub.setOption).toHaveBeenCalledTimes(1);
    const updateOptions = chartStub.setOption.mock.calls[0][1];
    expect(updateOptions).toEqual({ notMerge: true, lazyUpdate: false });
  });

  it("applies empty object when theme becomes falsy", async () => {
    const option = ref({});
    const theme = ref({ palette: ["#000"] } as any);
    const exposed = shallowRef<any>();

    renderChart(() => ({ option: option.value, theme: theme.value }), exposed);
    await nextTick();

    const current = chartStub;
    theme.value = undefined as any;
    await nextTick();

    expect(current.setTheme).toHaveBeenCalledWith({});
  });

  it("sets notMerge when options array shrinks", async () => {
    const option = ref({ options: [{}, {}] } as any);
    const exposed = shallowRef<any>();

    renderChart(() => ({ option: option.value }), exposed);
    await nextTick();

    chartStub.setOption.mockClear();
    option.value = { options: [{}] } as any;
    await nextTick();

    const updateOptions = chartStub.setOption.mock.calls[0][1];
    expect(updateOptions).toEqual(expect.objectContaining({ notMerge: true }));
  });

  it("does not re-initialize when calling setOption with an existing instance (manual)", async () => {
    const option = ref({ title: { text: "init-manual" } });
    const exposed = shallowRef<any>();

    renderChart(() => ({ option: option.value, manualUpdate: true }), exposed);

    init.mockClear();
    chartStub.setOption.mockClear();

    exposed.value.setOption({ title: { text: "after" } });
    await nextTick();

    expect(init).not.toHaveBeenCalled();
    expect(chartStub.setOption).toHaveBeenCalledTimes(1);
  });

  it("applies option reactively without re-initialization when option becomes defined", async () => {
    const option = ref<any>(null);
    const exposed = shallowRef<any>();

    renderChart(() => ({ option: option.value }), exposed);
    init.mockClear();
    chartStub.setOption.mockClear();

    option.value = { title: { text: "now-defined" } };
    await nextTick();

    expect(init).not.toHaveBeenCalled();
    expect(chartStub.setOption).toHaveBeenCalledTimes(1);
  });

  it("applies option when nested data mutates", async () => {
    const option = ref<Option>({
      series: [{ type: "bar", data: [1, 2, 3] }],
    });
    const exposed = shallowRef<any>();

    renderChart(() => ({ option: option.value }), exposed);
    await nextTick();

    chartStub.setOption.mockClear();

    (option.value!.series as any)[0].data.push(4);
    await nextTick();

    expect(chartStub.setOption).toHaveBeenCalledTimes(1);
    expect(chartStub.setOption.mock.calls[0][0]).toMatchObject({
      series: [{ data: [1, 2, 3, 4] }],
    });
  });

  it("honors override.replaceMerge in update options", async () => {
    const option = ref({ series: [{ type: "bar", data: [1] }] });
    const exposed = shallowRef<any>();

    renderChart(() => ({ option: option.value, manualUpdate: true }), exposed);
    await nextTick();

    chartStub.setOption.mockClear();
    exposed.value.setOption({ series: [{ type: "bar", data: [2] }] }, {
      replaceMerge: ["series"],
    } as any);

    expect(chartStub.setOption).toHaveBeenCalledTimes(1);
    const updateOptions = chartStub.setOption.mock.calls[0][1];
    expect(updateOptions).toEqual(
      expect.objectContaining({ replaceMerge: ["series"] }),
    );
  });

  it("merges base updateOptions from props during reactive updates", async () => {
    const option = ref<any>({ title: { text: "merge-base" } });
    const exposed = shallowRef<any>();

    renderChart(
      () => ({ option: option.value, updateOptions: { lazyUpdate: true } }),
      exposed,
    );
    await nextTick();

    chartStub.setOption.mockClear();
    // Change option to trigger reactive update without special plan flags
    option.value = { title: { text: "merge-base-2" } };
    await nextTick();

    const updateOptions = chartStub.setOption.mock.calls[0][1];
    expect(updateOptions).toEqual(
      expect.objectContaining({ lazyUpdate: true }),
    );
  });

  it("sets __dispose on root during unmount when wcRegistered and cleanup runs via disconnectedCallback", async () => {
    const option = ref({ title: { text: "wc-dispose" } });
    const exposed = shallowRef<any>();

    const screen = renderChart(() => ({ option: option.value }), exposed);
    await nextTick();

    const el: any =
      (exposed.value?.root?.value as HTMLElement | undefined) ??
      (document.querySelector("x-vue-echarts") as HTMLElement | null);
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
    const exposed = shallowRef<any>();

    const screen = renderChart(
      () => ({ option: option.value, manualUpdate: true }),
      exposed,
    );
    await nextTick();

    const callsBefore = chartStub.setOption.mock.calls.length;

    // Capture the function reference before unmount; template ref becomes null on unmount
    const callSetOption = exposed.value.setOption as (
      opt: any,
      notMerge?: any,
      lazyUpdate?: any,
    ) => void;

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
    const exposed = shallowRef<any>();

    const Root = defineComponent({
      setup() {
        return () =>
          h(
            ECharts,
            {
              option: option.value,
              ref: (v: any) => (exposed.value = v),
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

  it("skips resize when instance is disposed in autoresize path", async () => {
    const option = ref({});
    const exposed = shallowRef<any>();

    // Force the disposed branch in resize()
    chartStub.isDisposed.mockReturnValue(true as any);

    renderChart(() => ({ option: option.value, autoresize: true }), exposed);
    await nextTick();

    // resize should be skipped, commit should still apply option
    expect(chartStub.resize).not.toHaveBeenCalled();
    expect(chartStub.setOption).toHaveBeenCalled();
  });

  it("stops reactive updates after toggling manualUpdate to true", async () => {
    const option = ref({ title: { text: "start" } });
    const manual = ref(false);
    const exposed = shallowRef<any>();

    renderChart(
      () => ({ option: option.value, manualUpdate: manual.value }),
      exposed,
    );
    await nextTick();

    chartStub.setOption.mockClear();
    option.value = { title: { text: "reactive-1" } } as any;
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
    option.value = { title: { text: "reactive-2" } } as any;
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
    const exposed = shallowRef<any>();

    renderChart(
      () => ({ option: option.value, onClick: undefined as any }),
      exposed,
    );
    await nextTick();

    expect(chartStub.on).not.toHaveBeenCalled();
  });

  it("skips option watcher when chart instance is missing", async () => {
    const option = ref<any>(null);
    const exposed = shallowRef<any>();

    init.mockImplementation(() => undefined as any);

    renderChart(() => ({ option: option.value }), exposed);
    await nextTick();

    chartStub.setOption.mockClear();

    option.value = { title: { text: "later" } };
    await nextTick();

    expect(chartStub.setOption).not.toHaveBeenCalled();
  });
});
