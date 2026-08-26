import { computed, inject, toValue, watch, watchSyncEffect } from "vue";

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
  const options = computed<LoadingOptions>(() => ({
    ...toValue(defaultLoadingOptions),
    ...loadingOptions.value,
  }));
  let shown:
    | WeakMap<EChartsType, { type: string | undefined; options: LoadingOptions }>
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
      const previous = shown?.get(instance);

      if (
        !force &&
        previous &&
        previous.type === type &&
        shallowEqual(nextOptions, previous.options)
      ) {
        return;
      }

      // Custom renderers may mutate reactive config; block reentry and converge afterwards.
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
      (shown ??= new WeakMap()).set(instance, { type, options: nextOptions });
      sync();
      return;
    }

    if (shown?.delete(instance)) {
      instance.hideLoading();
    }
  }

  watchSyncEffect(() => sync());
  watch(options, (value, previous) => value === previous && sync(true), {
    deep: true,
    flush: "sync",
  });
}

export const loadingProps = {
  loading: Boolean,
  loadingType: String,
  loadingOptions: Object as PropType<LoadingOptions>,
};
