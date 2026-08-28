import { computed, inject, toValue, watch, watchSyncEffect } from "vue";

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
  let applying = false;

  function sync(force = false): void {
    const instance = chart.value;
    if (!instance || instance.isDisposed() || applying) {
      return;
    }

    if (loading.value) {
      const type = loadingType.value || undefined;
      const nextOptions = options.value;
      const previous = shown?.instance === instance ? shown : undefined;

      if (
        !force &&
        previous &&
        previous.type === type &&
        shallowEqual(nextOptions, previous.options)
      ) {
        return;
      }

      applying = true;
      try {
        if (type) {
          instance.showLoading(type, { ...nextOptions });
        } else {
          instance.showLoading({ ...nextOptions });
        }
      } finally {
        applying = false;
      }
      shown = { instance, type, options: nextOptions };
      return;
    }

    if (shown?.instance === instance) {
      instance.hideLoading();
      shown = undefined;
    }
  }

  const stopSync = watchSyncEffect(() => sync());
  const stopOptions = watch(
    () => (loading.value ? options.value : undefined),
    (value, previous) => value !== undefined && value === previous && sync(true),
    {
      deep: true,
      flush: "sync",
    },
  );

  return () => {
    stopSync();
    stopOptions();
  };
}

export const loadingProps = {
  loading: Boolean,
  loadingType: String,
  loadingOptions: Object as PropType<LoadingOptions>,
};
