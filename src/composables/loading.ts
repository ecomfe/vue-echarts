import { inject, watchSyncEffect, toValue } from "vue";

import type { Ref, InjectionKey, PropType } from "vue";
import type { EChartsType, LoadingOptions, LoadingOptionsInjection } from "../types";
import { shallowEqual } from "../utils";

export const LOADING_OPTIONS_KEY: InjectionKey<LoadingOptionsInjection> = Symbol();

export function useLoading(
  chart: Ref<EChartsType | undefined>,
  loading: Ref<boolean | undefined>,
  loadingType: Ref<string | undefined>,
  loadingOptions: Ref<LoadingOptions | undefined>,
): void {
  const defaultLoadingOptions = inject(LOADING_OPTIONS_KEY, undefined);
  let shown:
    | WeakMap<EChartsType, { type: string | undefined; options: LoadingOptions }>
    | undefined;

  watchSyncEffect(() => {
    const instance = chart.value;
    if (!instance || instance.isDisposed()) {
      return;
    }

    if (loading.value) {
      const type = loadingType.value || undefined;
      const options: LoadingOptions = {
        ...toValue(defaultLoadingOptions),
        ...loadingOptions.value,
      };
      const previous = shown?.get(instance);

      if (previous && previous.type === type && shallowEqual(options, previous.options)) {
        return;
      }

      // Loading renderers may fill defaults in place; keep the dedupe snapshot unchanged.
      if (type) {
        instance.showLoading(type, { ...options });
      } else {
        instance.showLoading({ ...options });
      }
      (shown ??= new WeakMap()).set(instance, { type, options });
      return;
    }

    if (shown?.delete(instance)) {
      instance.hideLoading();
    }
  });
}

export const loadingProps = {
  loading: Boolean,
  loadingType: String,
  loadingOptions: Object as PropType<LoadingOptions>,
};
