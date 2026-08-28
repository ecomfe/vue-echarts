import { computed, inject, toValue, watch } from "vue";

import type { Ref, InjectionKey, PropType } from "vue";
import type { EChartsType, LoadingOptions, LoadingOptionsInjection } from "../types";

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
        instance.hideLoading();
        return;
      }

      const { type, options: currentOptions } = state;
      if (type) {
        instance.showLoading(type, { ...currentOptions });
      } else {
        instance.showLoading({ ...currentOptions });
      }
    },
    { deep: true, immediate: true, flush: "sync" },
  );
}

export const loadingProps = {
  loading: Boolean,
  loadingType: String,
  loadingOptions: Object as PropType<LoadingOptions>,
};
