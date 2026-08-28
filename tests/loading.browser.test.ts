import { describe, it, expect, vi, afterEach } from "vitest";
import { defineComponent, nextTick, ref } from "vue";
import type { Ref } from "vue";
import { cleanup, render } from "vitest-browser-vue/pure";

import { useLoading, LOADING_OPTIONS_KEY } from "../src/composables/loading";
import type { EChartsType, LoadingOptions, LoadingOptionsInjection } from "../src/types";

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
  return { showLoading, hideLoading } as unknown as EChartsType;
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

  it("updates effective options and skips equivalent replacements", async () => {
    const showLoading = vi.fn();
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
      text: "Loading",
    });

    showLoading.mockClear();
    loadingOptions.value = { text: "Loading" };
    await nextTick();
    expect(showLoading).not.toHaveBeenCalled();

    defaults.value = { color: "#000" };
    await nextTick();
    expect(showLoading).toHaveBeenCalledOnce();
    expect(showLoading).toHaveBeenLastCalledWith({
      color: "#000",
      text: "Loading",
    });

    showLoading.mockClear();
    loadingOptions.value = { text: "Updated", custom: { color: "#fff" } };
    await nextTick();
    expect(showLoading).toHaveBeenCalledOnce();
    expect(showLoading).toHaveBeenLastCalledWith({
      color: "#000",
      custom: { color: "#fff" },
      text: "Updated",
    });

    showLoading.mockClear();
    (loadingOptions.value!.custom as { color: string }).color = "#000";
    await nextTick();
    expect(showLoading).toHaveBeenCalledOnce();
    expect(showLoading).toHaveBeenLastCalledWith({
      color: "#000",
      custom: { color: "#000" },
      text: "Updated",
    });

    loading.value = false;
    await nextTick();

    expect(hideLoading).toHaveBeenCalledTimes(1);
  });

  it("applies loading to a replacement chart", async () => {
    const firstShow = vi.fn();
    const secondShow = vi.fn();
    const secondHide = vi.fn();
    const chart = ref<EChartsType | undefined>();
    const loading = ref<boolean | undefined>(true);
    const loadingOptions = ref<LoadingOptions | undefined>({ text: "Switching" });
    const first = createChart(firstShow, vi.fn());
    const second = createChart(secondShow, secondHide);

    renderUseLoading(chart, loading, loadingOptions);

    chart.value = first;
    await nextTick();

    expect(firstShow).toHaveBeenCalledTimes(1);
    expect(firstShow).toHaveBeenLastCalledWith({ text: "Switching" });
    chart.value = second;
    await nextTick();

    expect(secondShow).toHaveBeenCalledTimes(1);
    expect(secondShow).toHaveBeenLastCalledWith({ text: "Switching" });
    expect(secondHide).not.toHaveBeenCalled();

    loading.value = false;
    await nextTick();
    expect(secondHide).toHaveBeenCalledTimes(1);
  });
});
