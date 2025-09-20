import { describe, it, expect, vi, afterEach } from "vitest";
import { ref, nextTick, type Ref, defineComponent } from "vue";
import { cleanup, render } from "vitest-browser-vue/pure";

import { useLoading, LOADING_OPTIONS_KEY } from "../src/composables/loading";
import type {
  EChartsType,
  LoadingOptions,
  LoadingOptionsInjection,
} from "../src/types";

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
            [LOADING_OPTIONS_KEY as symbol]: defaults,
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
    const loadingOptions = ref<LoadingOptions | undefined>({});

    renderUseLoading(chart, loading, loadingOptions);

    await nextTick();
    expect(showLoading).not.toHaveBeenCalled();
    expect(hideLoading).not.toHaveBeenCalled();

    chart.value = { showLoading, hideLoading } as unknown as EChartsType;
    await nextTick();

    expect(showLoading).toHaveBeenCalledTimes(1);
    expect(hideLoading).not.toHaveBeenCalled();
  });

  it("replays showLoading when injected defaults change while active", async () => {
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

    loading.value = false;
    await nextTick();

    expect(hideLoading).toHaveBeenCalledTimes(1);
    expect(showLoading).not.toHaveBeenCalledTimes(2);
  });

  it("replays showLoading when explicit options change while active", async () => {
    const showLoading = vi.fn();
    const hideLoading = vi.fn();
    const chart = ref<EChartsType | undefined>();
    const loading = ref<boolean | undefined>(true);
    const loadingOptions = ref<LoadingOptions | undefined>({
      text: "Initial",
      color: "#fff",
    });
    const defaults = ref({ maskColor: "rgba(0, 0, 0, 0.5)" });

    renderUseLoading(chart, loading, loadingOptions, () => defaults.value);

    chart.value = { showLoading, hideLoading } as unknown as EChartsType;
    await nextTick();

    expect(showLoading).toHaveBeenCalledTimes(1);
    expect(showLoading).toHaveBeenLastCalledWith({
      maskColor: "rgba(0, 0, 0, 0.5)",
      text: "Initial",
      color: "#fff",
    });
    expect(hideLoading).not.toHaveBeenCalled();

    showLoading.mockClear();
    loadingOptions.value = { text: "Updated", color: "#0f0" };
    await nextTick();

    expect(showLoading).toHaveBeenCalledTimes(1);
    expect(showLoading).toHaveBeenLastCalledWith({
      maskColor: "rgba(0, 0, 0, 0.5)",
      text: "Updated",
      color: "#0f0",
    });
    expect(hideLoading).not.toHaveBeenCalled();
  });
});
