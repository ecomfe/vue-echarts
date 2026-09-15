import { defineComponent, h, onErrorCaptured, ref, shallowRef } from "vue";
import type { Ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import { useLoading } from "../src/composables/loading";
import type { EChartsType, LoadingOptions } from "../src/types";
import { render } from "./helpers/testing";

async function mountLoading(
  chart: Ref<EChartsType | undefined>,
  options: Ref<LoadingOptions | undefined>,
  loading = ref(true),
) {
  return await render(
    defineComponent({
      setup() {
        useLoading(chart, loading, ref(), options);
        return () => h("div");
      },
    }),
  );
}

describe("useLoading", () => {
  it.each(["callback", "getter"])(
    "routes loading %s errors through the component",
    async (source) => {
      const chart = shallowRef<EChartsType>();
      const text = ref("Initial");
      const failure = new Error(`loading ${source} failed`);
      const options = ref({
        get text() {
          if (source === "getter" && text.value === "Changed") {
            throw failure;
          }
          return text.value;
        },
      });
      const captured = vi.fn();
      const errorHandler = vi.fn();
      const Child = defineComponent({
        setup() {
          useLoading(chart, ref(true), ref(), options);
          return () => h("div");
        },
      });
      await render(
        defineComponent({
          setup() {
            onErrorCaptured(captured);
            return () => h(Child);
          },
        }),
        { global: { config: { errorHandler } } },
      );
      chart.value = {
        showLoading: vi.fn(() => {
          if (source === "callback" && text.value === "Changed") {
            throw failure;
          }
        }),
        hideLoading: vi.fn(),
      } as unknown as EChartsType;

      expect(() => {
        text.value = "Changed";
      }).not.toThrow();
      expect(captured.mock.calls.map(([error]) => error)).toEqual([failure]);
      expect(errorHandler.mock.calls.map(([error]) => error)).toEqual([failure]);
    },
  );

  it("watches loading configuration without traversing chart internals", async () => {
    const readChartOption = vi.fn(() => ({
      series: Array.from({ length: 100 }, () => ({ data: [1, 2, 3] })),
    }));
    class Chart {
      showLoading = vi.fn();
      hideLoading = vi.fn();
      model = {
        get option() {
          return readChartOption();
        },
      };
    }
    const instance = new Chart();
    const chart = shallowRef(instance as unknown as EChartsType);
    const options = ref({ custom: { color: "red" } });
    const loading = ref(false);

    await mountLoading(chart, options, loading);
    expect(instance.hideLoading).toHaveBeenCalledOnce();
    expect(readChartOption).not.toHaveBeenCalled();

    loading.value = true;
    expect(instance.showLoading).toHaveBeenCalledWith({ custom: { color: "red" } });
    options.value.custom.color = "blue";
    expect(instance.showLoading).toHaveBeenLastCalledWith({ custom: { color: "blue" } });
    expect(instance.showLoading).toHaveBeenCalledTimes(2);
    expect(readChartOption).not.toHaveBeenCalled();
  });

  it("only observes loading options while a chart is active", async () => {
    const text = ref("Initial");
    const readText = vi.fn(() => text.value);
    const options = ref({
      get text() {
        return readText();
      },
    });
    const chart = shallowRef<EChartsType>();
    const instance = { showLoading: vi.fn(), hideLoading: vi.fn() };

    const screen = await mountLoading(chart, options);
    expect(readText).not.toHaveBeenCalled();

    chart.value = instance as unknown as EChartsType;
    expect(instance.showLoading).toHaveBeenCalledWith({ text: "Initial" });
    chart.value = undefined;
    readText.mockClear();
    text.value = "Changed";
    expect(readText).not.toHaveBeenCalled();
    expect(instance.showLoading).toHaveBeenCalledOnce();

    chart.value = instance as unknown as EChartsType;
    expect(instance.showLoading).toHaveBeenLastCalledWith({ text: "Changed" });
    await screen.unmount();
    readText.mockClear();
    text.value = "Unmounted";
    expect(readText).not.toHaveBeenCalled();
    expect(instance.showLoading).toHaveBeenCalledTimes(2);
  });

  it("synchronizes replacement charts while loading stays hidden", async () => {
    const first = { showLoading: vi.fn(), hideLoading: vi.fn() };
    const second = { showLoading: vi.fn(), hideLoading: vi.fn() };
    const chart = shallowRef(first as unknown as EChartsType);

    await mountLoading(chart, ref(), ref(false));
    expect(first.hideLoading).toHaveBeenCalledOnce();
    chart.value = second as unknown as EChartsType;
    expect(second.hideLoading).toHaveBeenCalledOnce();
    expect(first.hideLoading).toHaveBeenCalledOnce();
    expect(first.showLoading).not.toHaveBeenCalled();
    expect(second.showLoading).not.toHaveBeenCalled();
  });

  it("stops configuration updates when the first loading effect clears its chart", async () => {
    const chart = shallowRef<EChartsType>();
    const options = ref({ text: "Initial" });
    const first = {
      showLoading: vi.fn(() => {
        chart.value = undefined;
      }),
      hideLoading: vi.fn(),
    };
    chart.value = first as unknown as EChartsType;

    await mountLoading(chart, options);
    expect(first.showLoading).toHaveBeenCalledOnce();

    options.value.text = "Changed";
    expect(first.showLoading).toHaveBeenCalledOnce();

    const second = { showLoading: vi.fn(), hideLoading: vi.fn() };
    chart.value = second as unknown as EChartsType;
    expect(second.showLoading).toHaveBeenCalledWith({ text: "Changed" });
    options.value.text = "Latest";
    expect(second.showLoading).toHaveBeenLastCalledWith({ text: "Latest" });
    expect(first.showLoading).toHaveBeenCalledOnce();
  });
});
