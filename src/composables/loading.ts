import { computed, inject, toValue, watch } from "vue";

import type { Ref, InjectionKey, PropType } from "vue";
import type { EChartsType, LoadingOptions, LoadingOptionsInjection } from "../types";
import { shallowEqual } from "../utils";

export const LOADING_OPTIONS_KEY: InjectionKey<LoadingOptionsInjection> = Symbol.for(
  "vue-echarts.loading-options",
);

export function useLoading(
  chart: Ref<EChartsType | undefined>,
  loading: Ref<boolean | undefined>,
  loadingType: Ref<string | undefined>,
  loadingOptions: Ref<LoadingOptions | undefined>,
): () => void {
  const defaultLoadingOptions = inject(LOADING_OPTIONS_KEY, undefined);
  const options = computed<LoadingOptions>(() => ({
    ...toValue(defaultLoadingOptions),
    ...loadingOptions.value,
  }));
  let shown:
    | { instance: EChartsType; type: string | undefined; options: LoadingOptions }
    | undefined;

  return watch(
    () =>
      loading.value
        ? {
            instance: chart.value,
            visible: true as const,
            type: loadingType.value || undefined,
            options: options.value,
          }
        : { instance: chart.value, visible: false as const },
    (state) => {
      const { instance } = state;
      if (!instance) {
        return;
      }

      if (!state.visible) {
        if (shown?.instance === instance) {
          instance.hideLoading();
          shown = undefined;
        }
        return;
      }

      const { type, options: currentOptions } = state;
      const previous = shown?.instance === instance && shown.type === type ? shown : undefined;
      if (
        previous &&
        currentOptions !== previous.options &&
        shallowEqual(currentOptions, previous.options)
      ) {
        previous.options = currentOptions;
        return;
      }

      if (type) {
        instance.showLoading(type, { ...currentOptions });
      } else {
        instance.showLoading({ ...currentOptions });
      }
      shown = { instance, type, options: currentOptions };
    },
    { deep: true, immediate: true, flush: "sync" },
  );
}

export const loadingProps = {
  loading: Boolean,
  loadingType: String,
  loadingOptions: Object as PropType<LoadingOptions>,
};
