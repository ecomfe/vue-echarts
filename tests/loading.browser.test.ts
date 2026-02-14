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
  const Host = defineComponent({
    setup() {
      useLoading(chart, loading, loadingOptions);
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

    chart.value = { showLoading, hideLoading } as unknown as EChartsType;
    await nextTick();

    expect(showLoading).not.toHaveBeenCalled();
    expect(hideLoading).toHaveBeenCalledTimes(1);
    hideLoading.mockClear();

    loading.value = true;
    await nextTick();

    expect(showLoading).toHaveBeenCalledTimes(1);
    expect(showLoading).toHaveBeenCalledWith({
      maskColor: "rgba(0,0,0,0.5)",
      text: "Loading...",
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

    chart.value = { showLoading, hideLoading } as unknown as EChartsType;
    await nextTick();

    expect(showLoading).toHaveBeenCalledTimes(1);
    expect(hideLoading).not.toHaveBeenCalled();
  });

  it("replays showLoading when defaults or options change while active", async () => {
    const showLoading = vi.fn();
    const hideLoading = vi.fn();
    const chart = ref<EChartsType | undefined>();
    const loading = ref<boolean | undefined>(true);
    const loadingOptions = ref<LoadingOptions | undefined>({ text: "Loading" });
    const defaults = ref({ color: "#fff" });

    renderUseLoading(chart, loading, loadingOptions, () => defaults.value);

    chart.value = { showLoading, hideLoading } as unknown as EChartsType;
    await nextTick();

    expect(showLoading).toHaveBeenCalledTimes(1);
    expect(showLoading).toHaveBeenLastCalledWith({
      color: "#fff",
      text: "Loading",
    });
    expect(hideLoading).not.toHaveBeenCalled();

    showLoading.mockClear();
    defaults.value = { color: "#000" };
    await nextTick();

    expect(showLoading).toHaveBeenCalledTimes(1);
    expect(showLoading).toHaveBeenLastCalledWith({
      color: "#000",
      text: "Loading",
    });
    expect(hideLoading).not.toHaveBeenCalled();

    showLoading.mockClear();
    loadingOptions.value = { text: "Updated", color: "#0f0" };
    await nextTick();

    expect(showLoading).toHaveBeenCalledTimes(1);
    expect(showLoading).toHaveBeenLastCalledWith({
      color: "#0f0",
      text: "Updated",
    });
    expect(hideLoading).not.toHaveBeenCalled();

    loading.value = false;
    await nextTick();

    expect(hideLoading).toHaveBeenCalledTimes(1);
    expect(showLoading).not.toHaveBeenCalledTimes(2);
  });

  it("applies loading state to a new chart instance after chart ref switches", async () => {
    const firstShow = vi.fn();
    const firstHide = vi.fn();
    const secondShow = vi.fn();
    const secondHide = vi.fn();
    const chart = ref<EChartsType | undefined>();
    const loading = ref<boolean | undefined>(true);
    const loadingOptions = ref<LoadingOptions | undefined>({ text: "Switching" });

    renderUseLoading(chart, loading, loadingOptions);

    chart.value = { showLoading: firstShow, hideLoading: firstHide } as unknown as EChartsType;
    await nextTick();

    expect(firstShow).toHaveBeenCalledTimes(1);
    expect(firstShow).toHaveBeenLastCalledWith({ text: "Switching" });
    expect(firstHide).not.toHaveBeenCalled();

    chart.value = { showLoading: secondShow, hideLoading: secondHide } as unknown as EChartsType;
    await nextTick();

    expect(secondShow).toHaveBeenCalledTimes(1);
    expect(secondShow).toHaveBeenLastCalledWith({ text: "Switching" });
    expect(secondHide).not.toHaveBeenCalled();
  });
});
