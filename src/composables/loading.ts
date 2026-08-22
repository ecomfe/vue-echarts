import { inject, computed, watchEffect, toValue } from "vue";

import type { Ref, InjectionKey, PropType } from "vue";
import type { EChartsType, LoadingOptions, LoadingOptionsInjection } from "../types";

export const LOADING_OPTIONS_KEY: InjectionKey<LoadingOptionsInjection> = Symbol();

export function useLoading(
  chart: Ref<EChartsType | undefined>,
  loading: Ref<boolean | undefined>,
  loadingOptions: Ref<LoadingOptions | undefined>,
): void {
  const defaultLoadingOptions = inject(LOADING_OPTIONS_KEY, {});
  const realLoadingOptions = computed(() => ({
    ...toValue(defaultLoadingOptions),
    ...(loadingOptions.value ?? {}),
  }));
  let activeInstance: EChartsType | undefined;

  watchEffect(() => {
    const instance = chart.value;
    if (!instance) {
      return;
    }

    if (loading.value) {
      instance.showLoading(realLoadingOptions.value);
      activeInstance = instance;
      return;
    }

    if (activeInstance === instance) {
      instance.hideLoading();
    }
    activeInstance = undefined;
  });
}

export const loadingProps = {
  loading: Boolean,
  loadingOptions: Object as PropType<LoadingOptions>,
};
