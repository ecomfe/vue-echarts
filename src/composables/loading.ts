import { inject, watchSyncEffect, toValue } from "vue";

import type { Ref, InjectionKey, PropType } from "vue";
import type { EChartsType, LoadingOptions, LoadingOptionsInjection } from "../types";
import { shallowEqual } from "../utils";

export const LOADING_OPTIONS_KEY: InjectionKey<LoadingOptionsInjection> = Symbol();

export function useLoading(
  chart: Ref<EChartsType | undefined>,
  loading: Ref<boolean | undefined>,
  loadingOptions: Ref<LoadingOptions | undefined>,
): void {
  const defaultLoadingOptions = inject(LOADING_OPTIONS_KEY, undefined);
  let shownOptions: WeakMap<EChartsType, LoadingOptions> | undefined;

  watchSyncEffect(() => {
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

      if (previous && shallowEqual(options, previous)) {
        return;
      }

      // Loading renderers may fill defaults in place; keep the dedupe snapshot unchanged.
      instance.showLoading({ ...options });
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
