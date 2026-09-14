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
    // Track chart availability without including its internals in deep traversal.
    () =>
      chart.value && loading.value
        ? {
            type: loadingType.value || undefined,
            options: {
              ...toValue(defaultLoadingOptions),
              ...loadingOptions.value,
            },
          }
        : null,
    (state) => {
      const instance = chart.value;
      if (!instance) {
        return;
      }

      if (!state) {
        instance.hideLoading();
        return;
      }

      const { type, options } = state;
      if (type) {
        instance.showLoading(type, options);
      } else {
        instance.showLoading(options);
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
