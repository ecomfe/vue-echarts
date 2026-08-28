import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createApp,
  defineComponent,
  h,
  nextTick,
  provide,
  reactive,
  ref,
  shallowRef,
  watch,
} from "vue";
import type { Ref, VNodeRef } from "vue";
import { render } from "./helpers/testing";
import { init, enqueueChart, resetECharts, createEChartsModule } from "./helpers/mock";
import type { ChartStub } from "./helpers/mock";
import type { InitOptions, Option, SetOptionType, Theme, UpdateOptions } from "../src/types";
import { createFrame, withConsoleWarn } from "./helpers/dom";
import { makeTooltipParams } from "./helpers/tooltip";
import ECharts, { INIT_OPTIONS_KEY, THEME_KEY, UPDATE_OPTIONS_KEY } from "../src/ECharts";
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

function getLastSetOptionCall(stub: ChartStub): [Option, UpdateOptions | undefined] {
  const lastCall = stub.setOption.mock.calls.at(-1);
  if (!lastCall) {
    throw new Error("Expected chart.setOption to be called at least once.");
  }
  return lastCall as [Option, UpdateOptions | undefined];
}

beforeEach(() => {
  resetECharts();
  chartStub = enqueueChart();
});

describe("ECharts component", () => {
  it("initializes and reacts to reactive props", async () => {
    const option = ref({ title: { text: "coffee" } });
    const group = ref<string | undefined>("group-a");
    const exposed = shallowRef<Exposed>();
    const appliedGroups: Array<string | undefined> = [];
    chartStub.setOption.mockImplementation(() => appliedGroups.push(chartStub.group));

    const screen = renderChart(() => ({ option: option.value, group: group.value }), exposed);
    await nextTick();

    expect(init).toHaveBeenCalledTimes(1);
    const [rootEl, theme, initOptions] = init.mock.calls[0];
    expect(rootEl).toBeInstanceOf(HTMLElement);
    expect(theme).toBeUndefined();
    expect(initOptions).toBeUndefined();

    expect(chartStub.setOption).toHaveBeenCalledTimes(1);
    expect(chartStub.setOption.mock.calls[0][0]).toMatchObject({
      title: { text: "coffee" },
    });
    expect(chartStub.group).toBe("group-a");

    option.value = { title: { text: "latte" } };
    group.value = "group-b";
    await nextTick();
    expect(chartStub.setOption).toHaveBeenCalledTimes(2);
    expect(chartStub.setOption.mock.calls[1][0]).toMatchObject({
      title: { text: "latte" },
    });
    expect(chartStub.group).toBe("group-b");
    expect(appliedGroups).toEqual(["group-a", "group-b"]);

    group.value = undefined;
    await nextTick();
    expect(chartStub.group).toBe("");

    screen.unmount();
    await nextTick();
    expect(chartStub.dispose).toHaveBeenCalledTimes(1);
  });

  it("shows initial loading before applying the option", async () => {
    renderChart(() => ({ option: { series: [] }, loading: true }), shallowRef<Exposed>());
    await nextTick();

    expect(chartStub.showLoading).toHaveBeenCalledOnce();
    expect(chartStub.showLoading.mock.invocationCallOrder[0]).toBeLessThan(
      chartStub.setOption.mock.invocationCallOrder[0],
    );
  });

  it("stops initialization when a chart observer disposes synchronously", async () => {
    const exposed = shallowRef<Exposed>();
    const stop = watch(
      () => exposed.value?.chart,
      (instance) => instance && exposed.value?.dispose(),
      { flush: "sync" },
    );

    renderChart(() => ({ option: {} }), exposed);
    stop();
    await nextTick();

    expect(init).toHaveBeenCalledOnce();
    expect(chartStub.dispose).toHaveBeenCalledOnce();
    expect(chartStub.setOption).not.toHaveBeenCalled();
    expect(getExposed(exposed).isDisposed()).toBe(true);
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
    expect(chartStub.setOption.mock.calls[0][1]).toBeUndefined();
  });

  it("uses updateOptions for the initial manual-mode render but not manual calls", async () => {
    const exposed = shallowRef<Exposed>();
    const updateOptions: UpdateOptions = { lazyUpdate: true };

    renderChart(
      () => ({
        option: { title: { text: "initial" } },
        updateOptions,
        manualUpdate: true,
      }),
      exposed,
    );
    await nextTick();

    expect(getLastSetOptionCall(chartStub)[1]).toEqual(updateOptions);

    chartStub.setOption.mockClear();
    getExposed(exposed).setOption({ title: { text: "manual" } });

    expect(getLastSetOptionCall(chartStub)[1]).toBeUndefined();
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
    const colors = reactive(["#fff"]);
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
    currentStub.setOption.mockClear();
    theme.value = { color: colors };
    await nextTick();
    expect(currentStub.setTheme).toHaveBeenCalledWith({ color: colors });

    currentStub.setTheme.mockClear();
    currentStub.setOption.mockClear();
    theme.value = { color: colors };
    await nextTick();

    expect(currentStub.setTheme).not.toHaveBeenCalled();
    expect(currentStub.setOption).not.toHaveBeenCalled();

    colors[0] = "#000";
    theme.value = { color: colors };
    await nextTick();

    expect(currentStub.setTheme).toHaveBeenCalledOnce();
    expect(currentStub.setTheme).toHaveBeenCalledWith({ color: colors });

    theme.value = undefined;
    await nextTick();
    expect(currentStub.setTheme).toHaveBeenCalledWith({});
  });

  it("traverses reactive initialization inputs once per change", async () => {
    const readTheme = vi.fn(() => "#0ea5e9");
    const palette = reactive({
      get color() {
        return readTheme();
      },
      revision: 0,
    });
    const readLocale = vi.fn(() => "Chart");
    const locale = reactive({
      get title() {
        return readLocale();
      },
      revision: 0,
    });
    const theme = { palette } as unknown as Theme;
    const initOptions = { locale } as unknown as InitOptions;

    renderChart(() => ({ option: {}, theme, initOptions }), shallowRef<Exposed>());
    await nextTick();
    readTheme.mockClear();
    readLocale.mockClear();

    palette.revision++;
    await nextTick();
    expect(readTheme).toHaveBeenCalledOnce();
    expect(readLocale).not.toHaveBeenCalled();

    readTheme.mockClear();
    locale.revision++;
    await nextTick();
    expect(readTheme).not.toHaveBeenCalled();
    expect(readLocale).toHaveBeenCalledOnce();
  });

  it.each(["clear", "dispose"] as const)(
    "does not replay an option after a theme event calls %s",
    async (method) => {
      const option = ref<Option>({ title: { text: "theme-event" } });
      const theme = ref<Theme | undefined>("dark");
      const exposed = shallowRef<Exposed>();

      renderChart(
        () => ({
          option: option.value,
          theme: theme.value,
          onRendered: () => getExposed(exposed)[method](),
        }),
        exposed,
      );
      await nextTick();

      chartStub.setOption.mockClear();
      chartStub.setTheme.mockImplementation(() => {
        const binding = chartStub.on.mock.calls.find(([event]) => event === "rendered");
        binding?.[1]({ elapsedTime: 1 });
      });

      option.value = { title: { text: "discarded" } };
      theme.value = undefined;
      await nextTick();

      expect(chartStub.setTheme).toHaveBeenCalledWith({});
      expect(chartStub[method]).toHaveBeenCalledOnce();
      expect(chartStub.setOption).toHaveBeenCalledOnce();
    },
  );

  it("applies a theme changed by a synchronous ECharts event", async () => {
    const theme = reactive({ color: ["dark"] });
    const applied: string[] = [];
    chartStub.setTheme.mockImplementation(() => {
      applied.push(theme.color[0]);
      const binding = chartStub.on.mock.calls.find(([event]) => event === "updated");
      binding?.[1]({});
    });

    renderChart(
      () => ({
        option: {},
        theme,
        onUpdated: () => {
          if (theme.color[0] === "light") {
            theme.color[0] = "contrast";
          }
        },
      }),
      shallowRef<Exposed>(),
    );
    await nextTick();

    theme.color[0] = "light";
    await nextTick();

    expect(applied).toEqual(["light", "contrast"]);
  });

  it("lets an empty theme prop override an injected theme", async () => {
    const option: Option = {};
    const theme = ref<Theme | undefined>("");

    const Root = defineComponent({
      setup() {
        provide(THEME_KEY, "dark");
        return () => h(ECharts, { option, theme: theme.value });
      },
    });

    render(Root);
    await nextTick();

    expect(init.mock.calls[0][1]).toBe("");

    theme.value = undefined;
    await nextTick();
    expect(chartStub.setTheme).toHaveBeenLastCalledWith("dark");

    theme.value = "";
    await nextTick();
    expect(chartStub.setTheme).toHaveBeenLastCalledWith({});
  });

  it("does not auto-apply option on theme changes in manual-update mode", async () => {
    const option = ref<Option>({
      series: [{ type: "line", data: [1, 2, 3] }],
    });
    const theme = ref<Theme | undefined>("dark");
    const exposed = shallowRef<Exposed>();

    renderChart(
      () => ({
        option: option.value,
        theme: theme.value,
        manualUpdate: true,
      }),
      exposed,
    );
    await nextTick();

    chartStub.setOption.mockClear();
    theme.value = { palette: ["#0ea5e9"] };
    await nextTick();

    expect(chartStub.setTheme).toHaveBeenCalledWith({ palette: ["#0ea5e9"] });
    expect(chartStub.setOption).not.toHaveBeenCalled();
  });

  it("defers theme changes until the first option becomes available", async () => {
    const option = ref<Option | undefined>(undefined);
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

    chartStub.setOption.mockClear();
    chartStub.setTheme.mockClear();
    theme.value = undefined;
    await nextTick();

    expect(chartStub.setTheme).not.toHaveBeenCalled();
    expect(chartStub.setOption).not.toHaveBeenCalled();

    option.value = { title: { text: "late-option" } };
    await nextTick();
    expect(chartStub.setOption).toHaveBeenCalled();
    expect(chartStub.setTheme).toHaveBeenCalledWith({});
    expect(chartStub.setOption.mock.invocationCallOrder[0]).toBeLessThan(
      chartStub.setTheme.mock.invocationCallOrder[0],
    );
    expect(chartStub.setOption.mock.calls[0][0]).toMatchObject({
      title: { text: "late-option" },
    });

    chartStub.setOption.mockClear();
    theme.value = "dark";
    await nextTick();

    expect(chartStub.setTheme).toHaveBeenLastCalledWith("dark");
    expect(chartStub.setOption).toHaveBeenCalledOnce();
  });

  it("applies the latest option when theme and option change in the same tick", async () => {
    const option = ref<Option>({ title: { text: "first" } });
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

    chartStub.setOption.mockClear();
    chartStub.setTheme.mockClear();

    option.value = {
      title: { text: "second" },
      series: [{ type: "bar", data: [2, 4] }],
      graphic: [{ elements: [{ id: "cursor", type: "group", $action: "merge" }] }],
    };
    theme.value = { palette: ["#22d3ee"] };
    await nextTick();

    expect(chartStub.setTheme).toHaveBeenCalledWith({ palette: ["#22d3ee"] });
    expect(chartStub.setOption).toHaveBeenCalled();
    expect(chartStub.setTheme.mock.invocationCallOrder[0]).toBeLessThan(
      chartStub.setOption.mock.invocationCallOrder.at(-1)!,
    );
    const [lastOption] = getLastSetOptionCall(chartStub);
    expect(lastOption).toMatchObject({
      title: { text: "second" },
      series: [{ data: [2, 4] }],
    });
    expect(getLastSetOptionCall(chartStub)[1]).toEqual({ notMerge: false });
  });

  it("does not drop option changes derived from theme changes", async () => {
    const option = ref<Option>({ title: { text: "before" } });
    const theme = ref<Theme | undefined>("dark");

    const Root = defineComponent(() => {
      watch(
        theme,
        () => {
          option.value = { title: { text: "after" } };
        },
        { flush: "post" },
      );
      return () => h(ECharts, { option: option.value, theme: theme.value });
    });

    render(Root);
    await nextTick();
    chartStub.setOption.mockClear();

    theme.value = undefined;
    await nextTick();
    await nextTick();

    const [lastOption] = getLastSetOptionCall(chartStub);
    expect(lastOption).toMatchObject({ title: { text: "after" } });
  });

  it.each([false, true])(
    "re-initializes cleanly when initOptions and theme change in the same tick (autoresize: %s)",
    async (autoresize) => {
      const option = ref<Option>({ title: { text: "combo" } });
      const theme = ref<Theme | undefined>("dark");
      const initOptions = ref<InitOptions>({ renderer: "canvas" });
      const exposed = shallowRef<Exposed>();

      renderChart(
        () => ({
          option: option.value,
          initOptions: initOptions.value,
          theme: theme.value,
          autoresize,
        }),
        exposed,
      );
      await nextTick();

      const firstStub = chartStub;
      const replacementStub = enqueueChart();
      chartStub = replacementStub;
      init.mockClear();
      firstStub.dispose.mockClear();
      firstStub.setTheme.mockClear();

      theme.value = { palette: ["#f97316"] };
      initOptions.value = { renderer: "svg" };
      await nextTick();
      await nextTick();

      expect(firstStub.dispose).toHaveBeenCalledTimes(1);
      expect(init).toHaveBeenCalledTimes(1);
      const [, passedTheme, passedInit] = init.mock.calls[0];
      expect(passedTheme).toEqual({ palette: ["#f97316"] });
      expect(passedInit).toEqual({ renderer: "svg" });
      expect(firstStub.setTheme).not.toHaveBeenCalled();
      expect(replacementStub.setTheme).not.toHaveBeenCalled();
      expect(replacementStub.setOption).toHaveBeenCalledTimes(1);
      expect(replacementStub.setOption.mock.calls[0][0]).toMatchObject({
        title: { text: "combo" },
      });
    },
  );

  it("re-initializes only when initOptions change", async () => {
    const option = ref({ title: { text: "coffee" } });
    const initOptions = ref<InitOptions>({ useDirtyRect: true });
    const exposed = shallowRef<Exposed>();

    renderChart(() => ({ option: option.value, initOptions: initOptions.value }), exposed);
    await nextTick();

    const firstStub = chartStub;
    initOptions.value = { useDirtyRect: true };
    await nextTick();

    expect(firstStub.dispose).not.toHaveBeenCalled();
    expect(init).toHaveBeenCalledTimes(1);

    const secondStub = enqueueChart();
    chartStub = secondStub;

    initOptions.value = { width: undefined };
    await nextTick();

    expect(firstStub.dispose).toHaveBeenCalledTimes(1);
    expect(init).toHaveBeenCalledTimes(2);
    expect(secondStub.setOption).toHaveBeenCalledTimes(1);
    expect(secondStub.setOption.mock.calls[0][0]).toMatchObject({
      title: { text: "coffee" },
    });
  });

  it("preserves nested initOptions changes across equivalent root replacement", async () => {
    const locale = reactive({ time: { month: ["January"] } });
    const typedLocale = locale as unknown as NonNullable<InitOptions["locale"]>;
    const initOptions = ref<InitOptions>({ locale: typedLocale });
    const exposed = shallowRef<Exposed>();

    renderChart(() => ({ option: {}, initOptions: initOptions.value }), exposed);
    await nextTick();

    const firstStub = chartStub;
    chartStub = enqueueChart();
    locale.time.month[0] = "February";
    initOptions.value = { locale: typedLocale };
    await nextTick();

    expect(firstStub.dispose).toHaveBeenCalledOnce();
    expect(init).toHaveBeenCalledTimes(2);
    expect(init.mock.calls[1][2]).toMatchObject({
      locale: { time: { month: ["February"] } },
    });
  });

  it("initializes once with the latest injected defaults when they change before mounted", async () => {
    const initOptions = ref<InitOptions>({ renderer: "canvas" });
    const theme = ref<Theme>("dark");
    const Mutator = defineComponent({
      setup() {
        initOptions.value = { renderer: "svg" };
        theme.value = { palette: ["#22d3ee"] };
        return () => null;
      },
    });
    const Root = defineComponent({
      setup() {
        provide(INIT_OPTIONS_KEY, initOptions);
        provide(THEME_KEY, theme);
        return () => [h(ECharts, { option: { series: [] } }), h(Mutator)];
      },
    });

    render(Root);
    await nextTick();

    expect(init).toHaveBeenCalledTimes(1);
    expect(init.mock.calls[0][1]).toEqual({ palette: ["#22d3ee"] });
    expect(init.mock.calls[0][2]).toEqual({ renderer: "svg" });
    expect(chartStub.setTheme).not.toHaveBeenCalled();
    expect(chartStub.setOption).toHaveBeenCalledTimes(1);

    initOptions.value = { renderer: "svg" };
    await nextTick();
    expect(init).toHaveBeenCalledTimes(1);
    expect(chartStub.dispose).not.toHaveBeenCalled();
  });

  it("treats null and undefined injected themes as unavailable", async () => {
    const theme = ref<Theme | null | undefined>();
    const Root = defineComponent({
      setup() {
        provide(THEME_KEY, theme);
        return () => h(ECharts, { option: {} });
      },
    });

    render(Root);
    await nextTick();
    chartStub.setOption.mockClear();

    theme.value = null;
    await nextTick();

    expect(chartStub.setTheme).not.toHaveBeenCalled();
    expect(chartStub.setOption).not.toHaveBeenCalled();
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

  it("rebuilds once and refreshes the theme snapshot when returning to smart updates", async () => {
    const option = ref<Option>({
      series: [
        { id: "a", type: "line", data: [1] },
        { id: "b", type: "line", data: [2] },
      ],
    });
    const theme = ref<Theme | undefined>("dark");
    const updateOptions = ref<UpdateOptions | undefined>({ notMerge: false });
    const exposed = shallowRef<Exposed>();

    renderChart(
      () => ({ option: option.value, theme: theme.value, updateOptions: updateOptions.value }),
      exposed,
    );
    await nextTick();
    chartStub.setOption.mockClear();

    updateOptions.value = undefined;
    option.value = { series: [{ id: "b", type: "line", data: [3] }] };
    await nextTick();

    expect(getLastSetOptionCall(chartStub)[1]).toEqual({ notMerge: true });

    chartStub.setOption.mockClear();
    theme.value = undefined;
    await nextTick();

    expect(chartStub.setTheme).toHaveBeenCalledWith({});

    option.value = { series: [{ id: "b", type: "line", data: [4] }] };
    await nextTick();

    expect(getLastSetOptionCall(chartStub)[1]).toEqual({ notMerge: false });
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

    option.value = { title: { text: "manual" } };
    await nextTick();
    expect(firstStub.setOption).toHaveBeenCalledTimes(1);

    const replacementStub = enqueueChart();
    manualUpdate.value = false;
    chartStub = replacementStub;
    await nextTick();
    expect(firstStub.dispose).toHaveBeenCalledTimes(1);
    expect(firstStub.setOption).toHaveBeenCalledTimes(1);
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
  });

  it("does not traverse nested option changes in manual-update mode", async () => {
    const read = vi.fn(() => "manual");
    const title = reactive({
      get text() {
        return read();
      },
      revision: 0,
    });
    const option = { title } as Option;
    const exposed = shallowRef<Exposed>();

    renderChart(() => ({ option, manualUpdate: true }), exposed);
    await nextTick();
    read.mockClear();

    title.revision++;
    await nextTick();

    expect(read).not.toHaveBeenCalled();
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

  it("ignores manual setOption after disposal", async () => {
    const optionRef = ref({ title: { text: "initial" } });
    const exposed = shallowRef<Exposed>();

    renderChart(() => ({ option: optionRef.value, manualUpdate: true }), exposed);
    await nextTick();

    const instance = getExposed(exposed);
    const initCallsBefore = init.mock.calls.length;
    instance.dispose();
    chartStub.setOption.mockClear();

    const manualOption = { title: { text: "rehydrate" } };
    instance.setOption(manualOption);

    expect(init.mock.calls.length).toBe(initCallsBefore);
    expect(chartStub.setOption).not.toHaveBeenCalled();
    expect(instance.chart).toBeUndefined();
  });

  it("ignores absent options without losing the last update signature", async () => {
    const option = ref<Option | undefined>({
      series: [{ id: "old", type: "line", data: [1, 2, 3] }],
    });
    const exposed = shallowRef<Exposed>();

    renderChart(() => ({ option: option.value }), exposed);
    await nextTick();

    const activeChart = chartStub;
    expect(activeChart.setOption.mock.calls.length).toBeGreaterThan(0);
    activeChart.setOption.mockClear();

    option.value = undefined;
    await nextTick();

    expect(activeChart.setOption).not.toHaveBeenCalled();

    option.value = { title: { text: "replacement" } };
    await nextTick();

    expect(activeChart.setOption).toHaveBeenCalledOnce();
    expect(getLastSetOptionCall(activeChart)[1]).toEqual({
      notMerge: false,
      replaceMerge: ["series"],
    });
  });

  it("shows and hides loading based on props", async () => {
    const option = ref({});
    const loading = ref(true);
    const loadingType = ref("custom");
    const loadingOptions = ref({ text: "Loading", progress: 0.5 });
    const exposed = shallowRef<Exposed>();

    renderChart(
      () => ({
        option: option.value,
        loading: loading.value,
        loadingType: loadingType.value,
        loadingOptions: loadingOptions.value,
      }),
      exposed,
    );
    await nextTick();

    expect(chartStub.showLoading).toHaveBeenCalledWith(
      "custom",
      expect.objectContaining({ text: "Loading", progress: 0.5 }),
    );

    loadingType.value = "alternate";
    await nextTick();
    expect(chartStub.showLoading).toHaveBeenLastCalledWith(
      "alternate",
      expect.objectContaining({ text: "Loading", progress: 0.5 }),
    );

    loading.value = false;
    await nextTick();
    expect(chartStub.hideLoading).toHaveBeenCalledTimes(1);
  });

  it("binds chart listeners before the initial option commit", async () => {
    const onRendered = vi.fn();
    chartStub.setOption.mockImplementation(() => {
      const binding = chartStub.on.mock.calls.find(([event]) => event === "rendered");
      binding?.[1]({ elapsedTime: 1 });
    });

    const exposed = shallowRef<Exposed>();
    renderChart(() => ({ option: {}, onRendered }), exposed);
    await nextTick();

    expect(onRendered).toHaveBeenCalledOnce();
    expect(onRendered).toHaveBeenCalledWith({ elapsedTime: 1 });
  });

  it.each([false, true])(
    "keeps callback slots inactive after disposal during initial commit (autoresize: %s)",
    async (autoresize) => {
      const exposed = shallowRef<Exposed>();
      chartStub.setOption.mockImplementation(() => {
        const binding = chartStub.on.mock.calls.find(([event]) => event === "rendered");
        binding?.[1]({ elapsedTime: 1 });
      });

      const Root = defineComponent({
        setup: () => () =>
          h(
            ECharts,
            {
              option: { tooltip: {} },
              autoresize,
              onRendered: () => getExposed(exposed).dispose(),
              ref: createExposedRef(exposed),
            },
            { tooltip: () => h("span", "disposed") },
          ),
      });

      render(Root);
      await nextTick();
      await nextTick();

      const [patched] = getLastSetOptionCall(chartStub);
      const formatter = (patched.tooltip as { formatter?: (params: unknown) => unknown }).formatter;

      expect(chartStub.dispose).toHaveBeenCalledOnce();
      expect(formatter).toBeTypeOf("function");
      expect(formatter?.({})).toBeUndefined();
    },
  );

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
    const rootEl = getExposed(exposed).root ?? document.querySelector<HTMLElement>("x-vue-echarts");
    if (!rootEl) {
      throw new Error("Expected root element to be available.");
    }
    rootEl.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(nativeClick).toHaveBeenCalledTimes(1);
  });

  it("preserves native event names and Vue event options", async () => {
    const onChartReady = vi.fn();
    const onClickOnce = vi.fn();
    const exposed = shallowRef<Exposed>();

    renderChart(
      () => ({
        option: {},
        "onNative:ChartReady": onChartReady,
        "onNative:clickOnceCapture": onClickOnce,
      }),
      exposed,
    );
    await nextTick();

    const rootEl = getExposed(exposed).root;
    if (!rootEl) {
      throw new Error("Expected root element to be available.");
    }

    rootEl.dispatchEvent(new CustomEvent("ChartReady"));
    rootEl.dispatchEvent(new MouseEvent("click"));
    rootEl.dispatchEvent(new MouseEvent("click"));

    expect(onChartReady).toHaveBeenCalledOnce();
    expect(onClickOnce).toHaveBeenCalledOnce();
  });

  it("reactively updates chart and zr handlers without rebinding", async () => {
    const option = ref({});
    const onClickA = vi.fn();
    const onClickB = vi.fn();
    const onZrMoveA = vi.fn();
    const onZrMoveB = vi.fn();
    const clickHandler = ref(onClickA);
    const zrHandler = ref(onZrMoveA);
    const exposed = shallowRef<Exposed>();

    renderChart(
      () => ({
        option: option.value,
        onClick: clickHandler.value,
        "onZr:mousemove": zrHandler.value,
      }),
      exposed,
    );
    await nextTick();

    const firstChartBinding = chartStub.on.mock.calls.find((call) => call[0] === "click");
    if (!firstChartBinding) {
      throw new Error("Expected chart click handler to be bound.");
    }
    const firstChartListener = firstChartBinding[1];
    firstChartListener("first");
    expect(onClickA).toHaveBeenCalledWith("first");
    expect(onClickB).toHaveBeenCalledTimes(0);

    const zr = chartStub.getZr();
    const firstZrBinding = zr.on.mock.calls.find((call) => call[0] === "mousemove");
    if (!firstZrBinding) {
      throw new Error("Expected ZRender mousemove handler to be bound.");
    }
    const firstZrListener = firstZrBinding[1];
    firstZrListener("zr-first");
    expect(onZrMoveA).toHaveBeenCalledWith("zr-first");
    expect(onZrMoveB).toHaveBeenCalledTimes(0);

    chartStub.on.mockClear();
    chartStub.off.mockClear();
    zr.on.mockClear();
    zr.off.mockClear();

    clickHandler.value = onClickB;
    zrHandler.value = onZrMoveB;
    await nextTick();

    expect(chartStub.off).not.toHaveBeenCalled();
    expect(zr.off).not.toHaveBeenCalled();
    expect(chartStub.on).not.toHaveBeenCalled();
    expect(zr.on).not.toHaveBeenCalled();

    firstChartListener("second");
    expect(onClickA).toHaveBeenCalledTimes(1);
    expect(onClickB).toHaveBeenCalledWith("second");

    firstZrListener("zr-second");
    expect(onZrMoveA).toHaveBeenCalledTimes(1);
    expect(onZrMoveB).toHaveBeenCalledWith("zr-second");
  });

  it("reactively updates native DOM handlers", async () => {
    const option = ref({});
    const nativeA = vi.fn();
    const nativeB = vi.fn();
    const nativeHandler = ref(nativeA);
    const exposed = shallowRef<Exposed>();

    renderChart(
      () => ({
        option: option.value,
        "onNative:click": nativeHandler.value,
      }),
      exposed,
    );
    await nextTick();

    const rootEl = getExposed(exposed).root ?? document.querySelector<HTMLElement>("x-vue-echarts");
    if (!rootEl) {
      throw new Error("Expected root element to be available.");
    }

    rootEl.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(nativeA).toHaveBeenCalledTimes(1);
    expect(nativeB).toHaveBeenCalledTimes(0);

    nativeHandler.value = nativeB;
    await nextTick();

    rootEl.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(nativeA).toHaveBeenCalledTimes(1);
    expect(nativeB).toHaveBeenCalledTimes(1);
  });

  it("rebinds once handlers when attrs change and keeps one-shot behavior", async () => {
    const option = ref({});
    const onceA = vi.fn();
    const onceB = vi.fn();
    const onceHandler = ref(onceA);
    const exposed = shallowRef<Exposed>();

    renderChart(
      () => ({
        option: option.value,
        onClickOnce: onceHandler.value,
      }),
      exposed,
    );
    await nextTick();

    const firstBinding = chartStub.on.mock.calls.find((call) => call[0] === "click");
    if (!firstBinding) {
      throw new Error("Expected first once handler binding.");
    }
    const firstListener = firstBinding[1];
    firstListener("first");
    firstListener("first-again");
    expect(onceA).toHaveBeenCalledTimes(1);

    chartStub.on.mockClear();
    chartStub.off.mockClear();

    onceHandler.value = onceB;
    await nextTick();

    expect(chartStub.off).not.toHaveBeenCalled();

    const secondBinding = chartStub.on.mock.calls.find((call) => call[0] === "click");
    if (!secondBinding) {
      throw new Error("Expected second once handler binding.");
    }
    const secondListener = secondBinding[1];
    secondListener("second");
    secondListener("second-again");
    expect(onceB).toHaveBeenCalledTimes(1);
    expect(chartStub.off).toHaveBeenCalledOnce();
    expect(chartStub.off).toHaveBeenCalledWith("click", secondListener);
  });

  it("rebuilds when removing a series ID would shift another", async () => {
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

    option.value = {
      series: [{ id: "b", type: "bar", data: [3] }],
    };
    await nextTick();

    expect(chartStub.setOption).toHaveBeenCalledTimes(1);
    const updateOptions = chartStub.setOption.mock.calls[0][1];
    expect(updateOptions).toEqual({ notMerge: true });
  });

  it("observes the chart host and resizes before the initial commit", async () => {
    const option = ref({ title: { text: "auto" } });
    const exposed = shallowRef<Exposed>();
    const observeSpy = vi.spyOn(window.ResizeObserver.prototype, "observe");

    renderChart(() => ({ option: option.value, autoresize: true }), exposed);
    await nextTick();

    expect(chartStub.resize).toHaveBeenCalled();
    expect(observeSpy).toHaveBeenCalledWith(init.mock.calls[0][0]);
    observeSpy.mockRestore();
  });

  it("finishes deferred initialization without an option", async () => {
    const exposed = shallowRef<Exposed>();

    renderChart(() => ({ autoresize: true }), exposed);
    await nextTick();

    expect(getExposed(exposed).chart).toBe(chartStub);
    expect(chartStub.setOption).not.toHaveBeenCalled();
  });

  it("skips the initial resize while the chart host has a zero dimension", async () => {
    const exposed = shallowRef<Exposed>();

    renderChart(
      () => ({
        option: { title: { text: "hidden" } },
        autoresize: true,
        style: { width: "0", height: "80px" },
      }),
      exposed,
    );
    await nextTick();

    expect(chartStub.resize).not.toHaveBeenCalled();
    expect(chartStub.setOption).toHaveBeenCalledOnce();
  });

  it("skips deferred resize when autoresize is disabled before initialization", async () => {
    const option = { title: { text: "disabled" } };
    const autoresize = ref(true);
    const exposed = shallowRef<Exposed>();

    renderChart(() => ({ option, autoresize: autoresize.value }), exposed);
    autoresize.value = false;
    await nextTick();

    expect(chartStub.resize).not.toHaveBeenCalled();
    expect(chartStub.setOption).toHaveBeenCalledOnce();
  });

  it("stops deferred initialization when resize disposes the chart", async () => {
    const exposed = shallowRef<Exposed>();
    chartStub.resize.mockImplementation(() => getExposed(exposed).dispose());

    renderChart(() => ({ option: {}, autoresize: true }), exposed);
    await nextTick();

    expect(chartStub.resize).toHaveBeenCalledOnce();
    expect(chartStub.dispose).toHaveBeenCalledOnce();
    expect(chartStub.setOption).not.toHaveBeenCalled();
  });

  it("coalesces option changes before autoresize initialization", async () => {
    const option = ref<Option>({ title: { text: "initial" } });
    const exposed = shallowRef<Exposed>();

    renderChart(() => ({ option: option.value, autoresize: true }), exposed);
    option.value = { title: { text: "latest" } };
    await nextTick();

    expect(chartStub.resize).toHaveBeenCalledTimes(1);
    expect(chartStub.setOption).toHaveBeenCalledTimes(1);
    expect(chartStub.setOption.mock.calls[0][0]).toMatchObject({
      title: { text: "latest" },
    });
  });

  it("applies the first option assigned during autoresize initialization", async () => {
    const option = ref<Option>();
    const exposed = shallowRef<Exposed>();
    chartStub.resize.mockImplementation(() => {
      option.value = { title: { text: "during-resize" } };
    });

    renderChart(() => ({ option: option.value, autoresize: true }), exposed);
    await nextTick();
    await nextTick();

    expect(chartStub.setOption).toHaveBeenCalledOnce();
    expect(chartStub.setOption.mock.calls[0][0]).toMatchObject({
      title: { text: "during-resize" },
    });
  });

  it("keeps a manual option set during autoresize mount", async () => {
    const exposed = shallowRef<Exposed>();
    const manualOption = { title: { text: "manual" } };

    renderChart(
      () => ({
        option: { title: { text: "initial" } },
        manualUpdate: true,
        autoresize: true,
      }),
      exposed,
    );
    getExposed(exposed).setOption(manualOption);
    await nextTick();

    expect(chartStub.resize).toHaveBeenCalledTimes(1);
    expect(chartStub.setOption).toHaveBeenCalledTimes(1);
    expect(chartStub.setOption.mock.calls[0][0]).toMatchObject(manualOption);
  });

  it("keeps a public clear during autoresize mount without disabling updates", async () => {
    const option = ref<Option>({ series: [] });
    const exposed = shallowRef<Exposed>();

    renderChart(() => ({ option: option.value, autoresize: true }), exposed);
    getExposed(exposed).clear();
    await nextTick();

    expect(chartStub.resize).toHaveBeenCalledOnce();
    expect(chartStub.clear).toHaveBeenCalledOnce();
    expect(chartStub.setOption).not.toHaveBeenCalled();

    option.value = { title: { text: "updated" } };
    await nextTick();

    expect(chartStub.setOption).toHaveBeenCalledOnce();
    expect(chartStub.setOption.mock.calls[0][0]).toMatchObject(option.value);
  });

  it("uses a fresh update baseline after clear", async () => {
    const option = ref<Option>({
      series: [
        { id: "a", type: "bar" },
        { id: "b", type: "bar" },
      ],
    });
    const exposed = shallowRef<Exposed>();

    renderChart(() => ({ option: option.value }), exposed);
    await nextTick();

    getExposed(exposed).clear();
    chartStub.setOption.mockClear();
    option.value = { series: [{ id: "a", type: "bar" }] };
    await nextTick();

    expect(getLastSetOptionCall(chartStub)[1]).toEqual({ notMerge: false });
  });

  it.each(["option commit", "theme application"])(
    "preserves a public clear triggered during %s",
    async (phase) => {
      const option = ref<Option>({
        series: [
          { id: "a", type: "bar" },
          { id: "b", type: "bar" },
        ],
      });
      const theme = reactive({ backgroundColor: "white" });
      const exposed = shallowRef<Exposed>();
      const clearAt = phase === "option commit" ? 2 : 3;
      let updates = 0;

      const emitUpdated = () => {
        const listener = chartStub.on.mock.calls.find(([event]) => event === "updated")?.[1];
        listener?.({});
      };
      chartStub.setOption.mockImplementation(emitUpdated);
      chartStub.setTheme.mockImplementation(emitUpdated);
      renderChart(
        () => ({
          option: option.value,
          theme,
          onUpdated: () => {
            if (++updates === clearAt) {
              getExposed(exposed).clear();
            } else if (updates === 2) {
              theme.backgroundColor = "#222";
            }
          },
        }),
        exposed,
      );
      await nextTick();

      chartStub.setOption.mockClear();
      option.value = { series: [{ id: "a", type: "bar" }] };
      await nextTick();

      expect(chartStub.setOption).toHaveBeenCalledOnce();
      expect(chartStub.clear).toHaveBeenCalledOnce();

      chartStub.setOption.mockClear();
      theme.backgroundColor = "#333";
      await nextTick();

      expect(chartStub.setOption).not.toHaveBeenCalled();

      option.value = { title: { text: "after clear" } };
      await nextTick();

      expect(getLastSetOptionCall(chartStub)[1]).toEqual({ notMerge: false });
    },
  );

  it.each([false, true])(
    "initializes the latest option and theme before autoresize completes (manual: %s)",
    async (manualUpdate) => {
      const option = ref<Option>({ title: { text: "initial" } });
      const theme = ref<Theme | undefined>("dark");
      const exposed = shallowRef<Exposed>();

      renderChart(
        () => ({
          option: option.value,
          theme: theme.value,
          autoresize: true,
          manualUpdate,
        }),
        exposed,
      );
      option.value = { title: { text: "latest" } };
      theme.value = undefined;
      await nextTick();

      expect(chartStub.setTheme).toHaveBeenLastCalledWith({});
      expect(chartStub.setOption).toHaveBeenCalled();
      expect(chartStub.resize.mock.invocationCallOrder[0]).toBeLessThan(
        chartStub.setOption.mock.invocationCallOrder[0],
      );
      expect(chartStub.setOption.mock.calls[0][0]).toMatchObject({
        title: { text: "latest" },
      });
    },
  );

  it("preserves positional options in manual setOption", async () => {
    const option = ref({ title: { text: "manual" } });
    const exposed = shallowRef<Exposed>();

    renderChart(() => ({ option: option.value, manualUpdate: true }), exposed);
    await nextTick();

    chartStub.setOption.mockClear();
    getExposed(exposed).setOption({ title: { text: "b" } }, true, false);

    expect(chartStub.setOption).toHaveBeenCalledTimes(1);
    expect(getLastSetOptionCall(chartStub)[1]).toEqual({
      notMerge: true,
      lazyUpdate: false,
    });

    chartStub.setOption.mockClear();
    getExposed(exposed).setOption({ title: { text: "c" } }, undefined, true);

    expect(chartStub.setOption).toHaveBeenCalledTimes(1);
    expect(getLastSetOptionCall(chartStub)[1]).toEqual({ lazyUpdate: true });
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

  it("detects removals in option objects from another realm", async () => {
    const { iframe, ownerWindow } = createFrame();
    const option = ref<Option>(
      ownerWindow.JSON.parse('{"title":{"text":"Coffee","subtext":"Daily"}}'),
    );
    const exposed = shallowRef<Exposed>();
    const screen = renderChart(() => ({ option: option.value }), exposed);

    try {
      await nextTick();
      chartStub.setOption.mockClear();

      option.value = ownerWindow.JSON.parse('{"title":{"text":"Coffee"}}');
      await nextTick();

      expect(getLastSetOptionCall(chartStub)[1]).toEqual({
        notMerge: false,
        replaceMerge: ["title"],
      });
    } finally {
      screen.unmount();
      iframe.remove();
    }
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

  it("detaches listeners and stops reactive work after public disposal", async () => {
    const readTitle = vi.fn(() => "before");
    const readLoadingText = vi.fn((revision: number) => `Loading ${revision}`);
    const readResizeThrottle = vi.fn((revision: number) => 100 + revision);
    const loadingState = reactive({ revision: 0 });
    const resizeState = reactive({ revision: 0 });
    const title = reactive({
      get text() {
        return readTitle();
      },
      revision: 0,
    });
    const loadingOptions = {
      get text() {
        return readLoadingText(loadingState.revision);
      },
    };
    const autoresize = {
      get throttle() {
        return readResizeThrottle(resizeState.revision);
      },
    };
    const option = ref<Option>({ title });
    const initOptions = ref<InitOptions>({ renderer: "canvas" });
    const manualUpdate = ref(false);
    const onClick = vi.fn();
    const exposed = shallowRef<Exposed>();

    const screen = renderChart(
      () => ({
        option: option.value,
        initOptions: initOptions.value,
        manualUpdate: manualUpdate.value,
        loadingOptions,
        autoresize,
        onClick,
      }),
      exposed,
    );
    await nextTick();
    readTitle.mockClear();
    readLoadingText.mockClear();
    readResizeThrottle.mockClear();

    const instance = getExposed(exposed);
    const element = instance.root;
    if (!element) {
      throw new Error("Expected root element to be available.");
    }
    chartStub.dispose.mockClear();
    chartStub.off.mockClear();
    chartStub.setOption.mockClear();

    instance.dispose();
    instance.dispose();

    expect(chartStub.dispose).toHaveBeenCalledOnce();
    expect(chartStub.off).toHaveBeenCalledOnce();
    expect(chartStub.off.mock.invocationCallOrder[0]).toBeLessThan(
      chartStub.dispose.mock.invocationCallOrder[0],
    );
    expect(instance.chart).toBeUndefined();
    expect(instance.isDisposed()).toBe(true);
    expect(() => instance.getWidth()).toThrowError("ECharts has been disposed.");

    title.revision++;
    loadingState.revision++;
    resizeState.revision++;
    await nextTick();
    expect(readTitle).not.toHaveBeenCalled();
    expect(readLoadingText).not.toHaveBeenCalled();
    expect(readResizeThrottle).not.toHaveBeenCalled();

    init.mockClear();
    option.value = { title: { text: "after" } };
    initOptions.value = { renderer: "svg" };
    manualUpdate.value = true;
    await nextTick();

    expect(init).not.toHaveBeenCalled();
    expect(chartStub.setOption).not.toHaveBeenCalled();

    screen.unmount();
    expect(element.__dispose).toBeNull();
  });

  it.each([
    ["a reactive update", false],
    ["isDisposed", true],
  ])("stops reactive work when %s detects external disposal", async (_, checkDisposed) => {
    const readTitle = vi.fn(() => "before");
    const title = reactive({
      get text() {
        return readTitle();
      },
      revision: 0,
    });
    const option = ref<Option>({ title });
    const initOptions = ref<InitOptions>({ renderer: "canvas" });
    const manualUpdate = ref(false);
    const loading = ref(true);
    const loadingOptions = ref({ text: "before" });
    const group = ref("before");
    const exposed = shallowRef<Exposed>();

    const screen = renderChart(
      () => ({
        option: option.value,
        initOptions: initOptions.value,
        manualUpdate: manualUpdate.value,
        loading: loading.value,
        loadingOptions: loadingOptions.value,
        group: group.value,
      }),
      exposed,
    );
    await nextTick();

    const instance = getExposed(exposed);
    instance.chart?.dispose();
    if (checkDisposed) {
      expect(instance.isDisposed()).toBe(true);
    } else {
      title.revision++;
      await nextTick();
    }
    chartStub.setOption.mockClear();
    chartStub.showLoading.mockClear();
    chartStub.hideLoading.mockClear();
    init.mockClear();
    readTitle.mockClear();

    title.revision++;
    await nextTick();

    expect(readTitle).not.toHaveBeenCalled();

    option.value = { title: { text: "after" } };
    initOptions.value = { renderer: "svg" };
    manualUpdate.value = true;
    loadingOptions.value = { text: "after" };
    loading.value = false;
    group.value = "after";
    await nextTick();

    expect(chartStub.setOption).not.toHaveBeenCalled();
    expect(chartStub.showLoading).not.toHaveBeenCalled();
    expect(chartStub.hideLoading).not.toHaveBeenCalled();
    expect(chartStub.group).toBe("before");
    expect(init).not.toHaveBeenCalled();
    expect(instance.chart).toBeUndefined();
    expect(instance.isDisposed()).toBe(true);

    screen.unmount();
    expect(chartStub.dispose).toHaveBeenCalledOnce();
  });

  it("exposes chart and root as read-only accessors", async () => {
    const exposed = shallowRef<Exposed>();

    renderChart(() => ({ option: {} }), exposed);
    await nextTick();

    const instance = getExposed(exposed);
    const { chart, root } = instance;

    expect(chart).toBe(chartStub);
    expect(root).toBeInstanceOf(HTMLElement);
    expect(Reflect.set(instance, "chart", undefined)).toBe(false);
    expect(Reflect.set(instance, "root", undefined)).toBe(false);
    expect(instance.chart).toBe(chart);
    expect(instance.root).toBe(root);
  });

  it("transitions to disposed when the exposed ref disposes before mounted initialization", async () => {
    let instance: Exposed | undefined;
    const disposeOnRef: VNodeRef = (value) => {
      if (value && !instance) {
        instance = value as Exposed;
        expect(instance.isDisposed()).toBe(false);
        instance.dispose();
      }
    };
    const Root = defineComponent({
      setup: () => () =>
        h(ECharts, {
          ref: disposeOnRef,
          option: {},
        }),
    });

    render(Root);
    await nextTick();

    expect(init).not.toHaveBeenCalled();
    expect(instance?.isDisposed()).toBe(true);
  });

  it("keeps initialization unchanged when clear is called before mount", async () => {
    let instance: Exposed | undefined;
    const option = {};
    const clearOnRef: VNodeRef = (value) => {
      if (value && !instance) {
        const current = (instance = value as Exposed);
        expect(() => current.clear()).toThrowError("ECharts is not initialized yet.");
      }
    };

    render(
      defineComponent({
        setup: () => () => h(ECharts, { ref: clearOnRef, option }),
      }),
    );
    await nextTick();

    expect(instance).toBeDefined();
    expect(chartStub.setOption.mock.calls).toEqual([[option, { notMerge: false }]]);
  });

  it("clears public state after the component unmounts", async () => {
    const exposed = shallowRef<Exposed>();
    const screen = renderChart(() => ({ option: { series: [] } }), exposed);
    await nextTick();
    const instance = getExposed(exposed);

    screen.unmount();

    expect(instance.isDisposed()).toBe(true);
    expect(instance.chart).toBeUndefined();
    expect(instance.root).toBeUndefined();
    expect(() => instance.getOption()).toThrowError("ECharts has been disposed.");
  });

  it("disposes when unmounted from a detached container", () => {
    const container = document.createElement("div");
    const app = createApp({
      render: () => h(ECharts, { option: { series: [] } }),
    });
    app.mount(container);

    expect(container.isConnected).toBe(false);
    chartStub.dispose.mockClear();

    app.unmount();

    expect(chartStub.dispose).toHaveBeenCalledTimes(1);
  });

  it("sets __dispose on root during unmount when wcRegistered and cleanup runs via disconnectedCallback", async () => {
    const option = ref({ title: { text: "wc-dispose" } });
    const exposed = shallowRef<Exposed>();

    const screen = renderChart(() => ({ option: option.value }), exposed);
    await nextTick();

    const el = getExposed(exposed).root ?? document.querySelector<EChartsElement>("x-vue-echarts");
    if (!el) {
      throw new Error("Expected root element to be available.");
    }
    expect(el).toBeInstanceOf(HTMLElement);
    chartStub.dispose.mockClear();

    // Disconnect cleanup waits a microtask so a synchronously moved element can reconnect first.
    screen.unmount();
    await nextTick();

    expect(chartStub.dispose).toHaveBeenCalledTimes(1);
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

    // Public calls stop synchronously even if custom-element cleanup is deferred.
    screen.unmount();

    // Calling setOption after unmount should be a no-op and not throw
    expect(() => callSetOption({ title: { text: "after" } })).not.toThrow();

    expect(chartStub.setOption.mock.calls.length).toBe(callsBefore);

    await nextTick();
  });

  it("preserves update options when the callback slot set changes", async () => {
    const option = { title: { text: "with-slots" } };
    const showExtra = ref(true);
    const updateOptions = {
      notMerge: false,
      lazyUpdate: true,
      silent: true,
      replaceMerge: ["series"],
    };

    const Root = defineComponent({
      setup() {
        return () =>
          h(
            ECharts,
            {
              option,
              updateOptions,
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
    chartStub.setOption.mockClear();

    showExtra.value = false;
    await nextTick();
    await nextTick();

    expect(chartStub.setOption).toHaveBeenCalledOnce();
    expect(getLastSetOptionCall(chartStub)[1]).toEqual({
      ...updateOptions,
      notMerge: true,
    });
  });

  it.each([
    ["added with an option change", false, true, "second", false],
    ["removed with an option change", true, false, "second", true],
    ["added after option becomes absent", false, true, undefined, false],
    ["removed after option becomes absent", true, false, undefined, true],
  ] as const)(
    "updates callback slots when a slot is %s",
    async (_, initiallyVisible, nextVisible, nextText, expectedNotMerge) => {
      const option = ref<Option | undefined>({ title: { text: "first" } });
      const showExtra = ref(initiallyVisible);

      const Root = defineComponent({
        setup() {
          return () =>
            h(
              ECharts,
              { option: option.value },
              showExtra.value
                ? {
                    tooltip: () => h("span", "tooltip"),
                    "tooltip-extra": () => h("span", "extra"),
                  }
                : { tooltip: () => h("span", "tooltip") },
            );
        },
      });

      render(Root);
      await nextTick();
      chartStub.setOption.mockClear();

      option.value = nextText ? { title: { text: nextText } } : undefined;
      showExtra.value = nextVisible;
      await nextTick();
      await nextTick();

      expect(chartStub.setOption).toHaveBeenCalledOnce();
      const [patched, updateOptions] = getLastSetOptionCall(chartStub);
      expect(patched).toMatchObject({ title: { text: nextText ?? "first" } });
      expect(updateOptions?.notMerge).toBe(expectedNotMerge);
    },
  );

  it.each([
    ["option", false],
    ["option and theme", true],
  ] as const)(
    "makes a newly added callback slot available during the same %s update",
    async (_, changeTheme) => {
      const option = ref<Option>({ title: { text: "first" } });
      const theme = ref<Theme | undefined>("dark");
      const showTooltip = ref(false);
      let formatterResult: unknown;

      chartStub.setOption.mockImplementation((patched) => {
        const tooltip = (patched as { tooltip?: { formatter?: unknown } }).tooltip;
        const formatter = tooltip?.formatter;
        if (typeof formatter === "function") {
          formatterResult = formatter(makeTooltipParams(0), "");
        }
      });

      const Root = defineComponent({
        setup() {
          return () =>
            h(
              ECharts,
              { option: option.value, theme: theme.value },
              showTooltip.value ? { tooltip: () => h("span", "tooltip") } : {},
            );
        },
      });

      render(Root);
      await nextTick();
      chartStub.setOption.mockClear();

      option.value = { title: { text: "second" } };
      showTooltip.value = true;
      if (changeTheme) {
        theme.value = undefined;
      }
      await nextTick();

      expect(chartStub.setOption).toHaveBeenCalledOnce();
      expect(formatterResult).toBeInstanceOf(HTMLElement);
    },
  );

  it("defers callback slot removal until explicit setOption in manual-update mode", async () => {
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

    getExposed(exposed).setOption(option.value);
    expect(chartStub.setOption).toHaveBeenLastCalledWith(expect.anything(), { notMerge: true });

    chartStub.setOption.mockClear();
    getExposed(exposed).setOption(option.value);
    expect(chartStub.setOption.mock.calls[0][1]).toBeUndefined();
  });

  it("abandons deferred autoresize initialization after unmount", async () => {
    const option = ref({});
    const exposed = shallowRef<Exposed>();

    const screen = renderChart(() => ({ option: option.value, autoresize: true }), exposed);
    screen.unmount();
    await nextTick();

    expect(chartStub.dispose).toHaveBeenCalledTimes(1);
    expect(chartStub.resize).not.toHaveBeenCalled();
    expect(chartStub.setOption).not.toHaveBeenCalled();
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

    const firstStub = chartStub;
    const replacementStub = enqueueChart();
    manual.value = true;
    option.value = { title: { text: "manual-start" } };
    chartStub = replacementStub;
    await nextTick();
    expect(firstStub.dispose).toHaveBeenCalledTimes(1);
    expect(firstStub.setOption).toHaveBeenCalledTimes(1);
    expect(replacementStub.setOption).toHaveBeenCalledTimes(1);
    expect(replacementStub.setOption.mock.calls[0][0]).toMatchObject(option.value);
    chartStub.setOption.mockClear();

    option.value = { title: { text: "reactive-2" } };
    await nextTick();
    expect(chartStub.setOption).not.toHaveBeenCalled();
  });

  it("ignores falsy listeners during event binding", async () => {
    const option = ref({});
    const exposed = shallowRef<Exposed>();

    renderChart(() => ({ option: option.value, onClick: undefined }), exposed);
    await nextTick();

    expect(chartStub.on).not.toHaveBeenCalled();
  });

  it("skips theme replay when manualUpdate and theme trigger reinit together", async () => {
    const option = ref<Option>({ title: { text: "combo" } });
    const manualUpdate = ref(false);
    const theme = ref<Theme | undefined>("dark");
    const exposed = shallowRef<Exposed>();

    renderChart(
      () => ({
        option: option.value,
        manualUpdate: manualUpdate.value,
        theme: theme.value,
      }),
      exposed,
    );
    await nextTick();

    const firstStub = chartStub;
    const replacementStub = enqueueChart();
    chartStub = replacementStub;
    init.mockClear();
    firstStub.dispose.mockClear();
    firstStub.setTheme.mockClear();
    replacementStub.setOption.mockClear();
    replacementStub.setTheme.mockClear();

    manualUpdate.value = true;
    theme.value = undefined;
    await nextTick();

    expect(firstStub.dispose).toHaveBeenCalledTimes(1);
    expect(init).toHaveBeenCalledTimes(1);
    expect(init.mock.calls[0][1]).toBeUndefined();
    expect(firstStub.setTheme).not.toHaveBeenCalled();
    expect(replacementStub.setTheme).not.toHaveBeenCalled();
    expect(replacementStub.setOption).toHaveBeenCalledTimes(1);
  });

  it("applies latest option only to the replacement chart when initOptions change", async () => {
    const option = ref<Option>({ title: { text: "first" } });
    const initOptions = ref<InitOptions>({ renderer: "canvas" });
    const exposed = shallowRef<Exposed>();

    renderChart(
      () => ({
        option: option.value,
        initOptions: initOptions.value,
      }),
      exposed,
    );
    await nextTick();

    const firstStub = chartStub;
    const replacementStub = enqueueChart();
    chartStub = replacementStub;
    firstStub.setOption.mockClear();
    replacementStub.setOption.mockClear();

    option.value = { title: { text: "latest" } };
    initOptions.value = { renderer: "svg" };
    await nextTick();

    expect(firstStub.dispose).toHaveBeenCalledTimes(1);
    expect(firstStub.setOption).not.toHaveBeenCalled();
    expect(replacementStub.setOption).toHaveBeenCalledTimes(1);
    expect(replacementStub.setOption.mock.calls[0][0]).toMatchObject({
      title: { text: "latest" },
    });
  });

  it("uses latest updateOptions when option and theme change in the same tick", async () => {
    const option = ref<Option>({ series: [{ type: "bar", data: [1, 2] }] });
    const theme = ref<Theme | undefined>("dark");
    const updateOptions = ref<UpdateOptions>({ notMerge: false });
    const exposed = shallowRef<Exposed>();

    renderChart(
      () => ({
        option: option.value,
        theme: theme.value,
        updateOptions: updateOptions.value,
      }),
      exposed,
    );
    await nextTick();

    chartStub.setOption.mockClear();

    option.value = { series: [{ type: "bar", data: [3, 4] }] };
    updateOptions.value = { notMerge: true, replaceMerge: ["series"] };
    theme.value = undefined;
    await nextTick();

    expect(chartStub.setTheme).toHaveBeenLastCalledWith({});
    expect(chartStub.setOption).toHaveBeenCalled();
    const [latestOption, latestUpdateOptions] = getLastSetOptionCall(chartStub);
    expect(latestUpdateOptions).toEqual({
      notMerge: true,
      replaceMerge: ["series"],
    });
    expect(latestOption).toMatchObject(option.value);
  });

  it("keeps slot patching intact when slot set and theme change in the same tick", async () => {
    const option = ref<Option>({});
    const theme = ref<Theme | undefined>("dark");
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
              theme: theme.value,
              ref: setExposed,
            },
            showExtra.value
              ? {
                  tooltip: (params: unknown) => [
                    h("span", String((params as { dataIndex: number }).dataIndex)),
                  ],
                  "tooltip-extra": () => [h("span", "x")],
                }
              : {
                  tooltip: (params: unknown) => [
                    h("span", String((params as { dataIndex: number }).dataIndex)),
                  ],
                },
          );
      },
    });

    render(Root);
    await nextTick();
    await nextTick();

    chartStub.setOption.mockClear();
    showExtra.value = false;
    theme.value = undefined;
    await nextTick();
    await nextTick();

    expect(chartStub.setTheme).toHaveBeenLastCalledWith({});
    expect(chartStub.setOption).toHaveBeenCalled();
    const [patchedOption] = getLastSetOptionCall(chartStub) as [Record<string, unknown>, unknown];
    const tooltip = patchedOption.tooltip as { formatter?: unknown } | undefined;
    expect(typeof tooltip?.formatter).toBe("function");
  });

  it("preserves loading state across initOptions-triggered reinit", async () => {
    const option = ref<Option>({ title: { text: "loading-reinit" } });
    const loading = ref(true);
    const initOptions = ref<InitOptions>({ renderer: "canvas" });
    const exposed = shallowRef<Exposed>();

    renderChart(
      () => ({
        option: option.value,
        loading: loading.value,
        initOptions: initOptions.value,
      }),
      exposed,
    );
    await nextTick();

    const firstStub = chartStub;
    const replacementStub = enqueueChart();
    chartStub = replacementStub;

    initOptions.value = { renderer: "svg" };
    await nextTick();

    expect(firstStub.dispose).toHaveBeenCalledTimes(1);
    expect(replacementStub.showLoading).toHaveBeenCalled();
    expect(replacementStub.hideLoading).not.toHaveBeenCalled();
  });
});
