import { describe, it, expect, vi, afterEach } from "vitest";
import { defineComponent, nextTick, ref } from "vue";
import type { Ref } from "vue";
import { cleanup, render } from "vitest-browser-vue/pure";

import { useLoading, LOADING_OPTIONS_KEY } from "../src/composables/loading";
import type { EChartsType, LoadingOptions, LoadingOptionsInjection } from "../src/types";
import { withConsoleWarn } from "./helpers/dom";

afterEach(() => {
  cleanup();
});

function renderUseLoading(
  chart: Ref<EChartsType | undefined>,
  loading: Ref<boolean | undefined>,
  loadingOptions: Ref<LoadingOptions | undefined>,
  defaults?: LoadingOptionsInjection,
) {
  const loadingType = ref<string>();
  const Host = defineComponent({
    setup() {
      useLoading(chart, loading, loadingType, loadingOptions);
      return () => null;
    },
  });

  const renderOptions = defaults
    ? {
        global: {
          provide: {
            [LOADING_OPTIONS_KEY]: defaults,
          },
        },
      }
    : undefined;

  return render(Host, renderOptions);
}

function createChart(showLoading: unknown, hideLoading: unknown): EChartsType {
  return { showLoading, hideLoading, isDisposed: () => false } as unknown as EChartsType;
}

describe("useLoading", () => {
  it("merges injected defaults with explicit options when showing loading", async () => {
    const showLoading = vi.fn();
    const hideLoading = vi.fn();
    const chart = ref<EChartsType | undefined>();
    const loading = ref<boolean | undefined>(false);
    const loadingOptions = ref<LoadingOptions | undefined>({
      text: "Loading...",
    });

    renderUseLoading(chart, loading, loadingOptions, () => ({
      maskColor: "rgba(0,0,0,0.5)",
    }));

    chart.value = createChart(showLoading, hideLoading);
    await nextTick();

    expect(showLoading).not.toHaveBeenCalled();
    expect(hideLoading).not.toHaveBeenCalled();

    loadingOptions.value = { text: "Ready..." };
    await nextTick();
    expect(showLoading).not.toHaveBeenCalled();
    expect(hideLoading).not.toHaveBeenCalled();

    loading.value = true;
    await nextTick();

    expect(showLoading).toHaveBeenCalledTimes(1);
    expect(showLoading).toHaveBeenCalledWith({
      maskColor: "rgba(0,0,0,0.5)",
      text: "Ready...",
    });

    loading.value = false;
    await nextTick();

    expect(hideLoading).toHaveBeenCalledTimes(1);
  });

  it("does nothing until an instance is available", async () => {
    const showLoading = vi.fn();
    const hideLoading = vi.fn();
    const chart = ref<EChartsType | undefined>();
    const loading = ref<boolean | undefined>(true);
    const loadingOptions = ref<LoadingOptions | undefined>(undefined);

    renderUseLoading(chart, loading, loadingOptions);

    await nextTick();
    expect(showLoading).not.toHaveBeenCalled();
    expect(hideLoading).not.toHaveBeenCalled();

    chart.value = createChart(showLoading, hideLoading);
    await nextTick();

    expect(showLoading).toHaveBeenCalledTimes(1);
    expect(hideLoading).not.toHaveBeenCalled();
  });

  it("defers reading loading options while the effect is hidden", async () => {
    const revision = ref(0);
    const readText = vi.fn((value: number) => `Loading ${value}`);
    const showLoading = vi.fn();
    const chart = ref<EChartsType | undefined>();
    const loading = ref<boolean | undefined>(false);
    const loadingOptions = ref<LoadingOptions | undefined>({
      get text() {
        return readText(revision.value);
      },
    });

    renderUseLoading(chart, loading, loadingOptions);
    chart.value = createChart(showLoading, vi.fn());
    await nextTick();
    readText.mockClear();

    revision.value++;
    await nextTick();
    expect(readText).not.toHaveBeenCalled();

    loading.value = true;
    await nextTick();
    expect(showLoading).toHaveBeenCalledOnce();
    expect(showLoading).toHaveBeenCalledWith({ text: "Loading 1" });
  });

  it("replays showLoading only for effective changes despite renderer mutations", async () => {
    const showLoading = vi.fn((options: LoadingOptions) => {
      options.maskColor ??= "rgba(255,255,255,0.8)";
      const custom = options.custom as { size?: number } | undefined;
      if (custom) {
        custom.size ??= 12;
      }
    });
    const hideLoading = vi.fn();
    const chart = ref<EChartsType | undefined>();
    const loading = ref<boolean | undefined>(true);
    const loadingOptions = ref<LoadingOptions | undefined>({ text: "Loading" });
    const defaults = ref({ color: "#fff" });

    renderUseLoading(chart, loading, loadingOptions, () => defaults.value);

    chart.value = createChart(showLoading, hideLoading);
    await nextTick();

    expect(showLoading).toHaveBeenCalledTimes(1);
    expect(showLoading).toHaveBeenLastCalledWith({
      color: "#fff",
      maskColor: "rgba(255,255,255,0.8)",
      text: "Loading",
    });
    expect(hideLoading).not.toHaveBeenCalled();

    showLoading.mockClear();
    loadingOptions.value = { text: "Loading" };
    await nextTick();

    expect(showLoading).not.toHaveBeenCalled();

    defaults.value = { color: "#000" };
    await nextTick();

    expect(showLoading).toHaveBeenCalledTimes(1);
    expect(showLoading).toHaveBeenLastCalledWith({
      color: "#000",
      maskColor: "rgba(255,255,255,0.8)",
      text: "Loading",
    });
    expect(hideLoading).not.toHaveBeenCalled();

    showLoading.mockClear();
    loadingOptions.value = { text: "Updated", color: "#0f0", custom: { color: "#fff" } };
    await nextTick();

    expect(showLoading).toHaveBeenCalledTimes(1);
    expect(showLoading).toHaveBeenLastCalledWith({
      color: "#0f0",
      custom: { color: "#fff", size: 12 },
      maskColor: "rgba(255,255,255,0.8)",
      text: "Updated",
    });
    expect(hideLoading).not.toHaveBeenCalled();

    showLoading.mockClear();
    (loadingOptions.value!.custom as { color: string }).color = "#000";
    await nextTick();

    expect(showLoading).toHaveBeenCalledOnce();
    expect(showLoading).toHaveBeenLastCalledWith({
      color: "#0f0",
      custom: { color: "#000", size: 12 },
      maskColor: "rgba(255,255,255,0.8)",
      text: "Updated",
    });

    loading.value = false;
    await nextTick();

    expect(hideLoading).toHaveBeenCalledTimes(1);
    expect(showLoading).not.toHaveBeenCalledTimes(2);
  });

  it("converges state changes made while toggling the loading effect", async () => {
    const chart = ref<EChartsType | undefined>();
    const loading = ref<boolean | undefined>(true);
    const loadingOptions = ref<LoadingOptions | undefined>({ text: "Initial" });
    const showLoading = vi.fn((options: LoadingOptions) => {
      if (options.text === "Initial") {
        loadingOptions.value = { text: "Latest" };
      } else {
        loading.value = false;
      }
    });
    const hideLoading = vi.fn(() => {
      if (hideLoading.mock.calls.length === 1) {
        loading.value = true;
      }
    });

    renderUseLoading(chart, loading, loadingOptions);
    chart.value = createChart(showLoading, hideLoading);
    await nextTick();

    expect(showLoading).toHaveBeenCalledTimes(3);
    expect(showLoading).toHaveBeenNthCalledWith(1, { text: "Initial" });
    expect(showLoading).toHaveBeenNthCalledWith(2, { text: "Latest" });
    expect(showLoading).toHaveBeenNthCalledWith(3, { text: "Latest" });
    expect(hideLoading).toHaveBeenCalledTimes(2);
  });

  it("retries the previous loading effect after a replacement fails", async () => {
    const error = new Error("showLoading failed");
    let visibleText: string | undefined;
    const showLoading = vi.fn((options: LoadingOptions) => {
      visibleText = undefined;
      if (options.text === "Broken") {
        throw error;
      }
      visibleText = options.text;
    });
    const chart = ref<EChartsType | undefined>();
    const loading = ref<boolean | undefined>(true);
    const loadingOptions = ref<LoadingOptions | undefined>({ text: "Initial" });

    renderUseLoading(chart, loading, loadingOptions);
    chart.value = createChart(showLoading, vi.fn());
    await nextTick();

    expect(visibleText).toBe("Initial");
    withConsoleWarn(() => {
      expect(() => {
        loadingOptions.value = { text: "Broken" };
      }).toThrow(error);
    });
    expect(visibleText).toBeUndefined();

    loadingOptions.value = { text: "Initial" };

    expect(showLoading).toHaveBeenCalledTimes(3);
    expect(visibleText).toBe("Initial");
  });

  it("retains shown state when hideLoading fails", async () => {
    const error = new Error("hideLoading failed");
    const showLoading = vi.fn();
    const hideLoading = vi.fn();
    hideLoading.mockImplementationOnce(() => {
      throw error;
    });
    const chart = ref<EChartsType | undefined>();
    const loading = ref<boolean | undefined>(true);
    const loadingOptions = ref<LoadingOptions | undefined>();

    renderUseLoading(chart, loading, loadingOptions);
    chart.value = createChart(showLoading, hideLoading);
    await nextTick();

    withConsoleWarn(() => {
      expect(() => {
        loading.value = false;
      }).toThrow(error);
    });

    loading.value = true;
    loading.value = false;

    expect(showLoading).toHaveBeenCalledOnce();
    expect(hideLoading).toHaveBeenCalledTimes(2);
  });

  it("tracks loading state across chart instance switches", async () => {
    const firstShow = vi.fn();
    const firstHide = vi.fn();
    const secondShow = vi.fn();
    const secondHide = vi.fn();
    const chart = ref<EChartsType | undefined>();
    const loading = ref<boolean | undefined>(true);
    const loadingOptions = ref<LoadingOptions | undefined>({ text: "Switching" });
    const first = createChart(firstShow, firstHide);
    const second = createChart(secondShow, secondHide);

    renderUseLoading(chart, loading, loadingOptions);

    chart.value = first;
    await nextTick();

    expect(firstShow).toHaveBeenCalledTimes(1);
    expect(firstShow).toHaveBeenLastCalledWith({ text: "Switching" });
    expect(firstHide).not.toHaveBeenCalled();

    chart.value = second;
    await nextTick();

    expect(secondShow).toHaveBeenCalledTimes(1);
    expect(secondShow).toHaveBeenLastCalledWith({ text: "Switching" });
    expect(secondHide).not.toHaveBeenCalled();

    loading.value = false;
    await nextTick();
    expect(secondHide).toHaveBeenCalledTimes(1);

    chart.value = first;
    await nextTick();
    expect(firstHide).toHaveBeenCalledTimes(1);
  });
});
