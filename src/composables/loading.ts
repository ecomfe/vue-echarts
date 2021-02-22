import { inject, unref, computed, Ref, watchEffect } from "vue-demi";
import { EChartsType } from "../types";

export const LOADING_OPTIONS_KEY = "ecLoadingOptions";

export function useLoading(
  chart: Ref<EChartsType | undefined>,
  loading: Ref<boolean>,
  loadingOptions?: Ref<object | undefined>
): void {
  const defaultLoadingOptions = inject(LOADING_OPTIONS_KEY, {}) as
    | object
    | Ref<object>;
  const realLoadingOptions = computed(() => ({
    ...unref(defaultLoadingOptions),
    ...loadingOptions?.value
  }));

  watchEffect(() => {
    const instance = chart.value;
    if (!instance) {
      return;
    }

    if (loading.value) {
      instance.showLoading(realLoadingOptions.value);
    } else {
      instance.hideLoading();
    }
  });
}

export const loadingProps = {
  loading: Boolean,
  loadingOptions: Object
};
