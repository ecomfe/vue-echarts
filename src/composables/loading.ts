import { inject, watchEffect, toValue } from "vue";

import type { Ref, InjectionKey, PropType } from "vue";
import type { EChartsType, LoadingOptions, LoadingOptionsInjection } from "../types";

export const LOADING_OPTIONS_KEY: InjectionKey<LoadingOptionsInjection> = Symbol();

export function useLoading(
  chart: Ref<EChartsType | undefined>,
  loading: Ref<boolean | undefined>,
  loadingOptions: Ref<LoadingOptions | undefined>,
): void {
  const defaultLoadingOptions = inject(LOADING_OPTIONS_KEY, undefined);
  let activeInstances: WeakSet<EChartsType> | undefined;

  watchEffect(() => {
    const instance = chart.value;
    if (!instance) {
      return;
    }

    if (loading.value) {
      instance.showLoading({
        ...toValue(defaultLoadingOptions),
        ...loadingOptions.value,
      });
      (activeInstances ??= new WeakSet()).add(instance);
      return;
    }

    if (activeInstances?.has(instance)) {
      instance.hideLoading();
      activeInstances.delete(instance);
    }
  });
}

export const loadingProps = {
  loading: Boolean,
  loadingOptions: Object as PropType<LoadingOptions>,
};
