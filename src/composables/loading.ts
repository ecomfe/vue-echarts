import { inject, toValue, watch } from "vue";

import type { Ref, InjectionKey, PropType } from "vue";
import type { EChartsType, LoadingOptions, LoadingOptionsInjection } from "../types";

export const LOADING_OPTIONS_KEY: InjectionKey<LoadingOptionsInjection> = Symbol();

export function useLoading(
  chart: Ref<EChartsType | undefined>,
  loading: Ref<boolean | undefined>,
  loadingType: Ref<string | undefined>,
  loadingOptions: Ref<LoadingOptions | undefined>,
): () => void {
  const defaultLoadingOptions = inject(LOADING_OPTIONS_KEY, undefined);

  return watch(
    () =>
      loading.value
        ? {
            instance: chart.value,
            visible: true as const,
            type: loadingType.value || undefined,
            options: {
              ...toValue(defaultLoadingOptions),
              ...loadingOptions.value,
            },
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
        instance.showLoading(type, currentOptions);
      } else {
        instance.showLoading(currentOptions);
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
