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
  let shownOptions: WeakMap<EChartsType, LoadingOptions> | undefined;

  watchEffect(() => {
    const instance = chart.value;
    if (!instance) {
      return;
    }

    if (loading.value) {
      const options: LoadingOptions = {
        ...toValue(defaultLoadingOptions),
        ...loadingOptions.value,
      };
      const previous = shownOptions?.get(instance);
      const keys = Object.keys(options) as (keyof LoadingOptions)[];

      if (
        previous &&
        keys.length === Object.keys(previous).length &&
        keys.every((key) => Object.is(options[key], previous[key]))
      ) {
        return;
      }

      instance.showLoading(options);
      (shownOptions ??= new WeakMap()).set(instance, options);
      return;
    }

    if (shownOptions?.delete(instance)) {
      instance.hideLoading();
    }
  });
}

export const loadingProps = {
  loading: Boolean,
  loadingOptions: Object as PropType<LoadingOptions>,
};
