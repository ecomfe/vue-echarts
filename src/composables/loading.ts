import { unwrapInjected } from "../utils";
import {
  inject,
  computed,
  watchEffect,
  type Ref,
  type InjectionKey,
  type PropType, unref
} from "vue-demi";
import type { EChartsType, LoadingOptions } from "../types";
import { toRaw } from "vue";

export const LOADING_OPTIONS_KEY =
  "ecLoadingOptions" as unknown as InjectionKey<
    LoadingOptions | Ref<LoadingOptions>
  >;

export function useLoading(
  chart: Ref<EChartsType | undefined>,
  loading: Ref<boolean>,
  loadingOptions: Ref<LoadingOptions | undefined>
): void {
  const defaultLoadingOptions = inject(LOADING_OPTIONS_KEY, {});
  const realLoadingOptions = computed(() => ({
    ...toRaw(defaultLoadingOptions),
    ...loadingOptions?.value
  }));

  watchEffect(() => {
    const instance = chart.value;
    if (!instance) {
      return;
    }

    if (loading.value) {
      console.warn("show loading", realLoadingOptions.value);
      instance.showLoading(realLoadingOptions.value);
    } else {
      instance.hideLoading();
    }
  });
}

export const loadingProps = {
  loading: Boolean,
  loadingOptions: Object as PropType<LoadingOptions>
};
