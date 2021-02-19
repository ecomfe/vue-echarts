import { Ref, watchEffect } from "vue-demi";
import { EChartsType } from "../types";

export function useLoading(
  chart: Ref<EChartsType | undefined>,
  loading: Ref<boolean>,
  loadingOptions?: Ref<object | undefined>
): void {
  watchEffect(() => {
    const instance = chart.value;
    if (!instance) {
      return;
    }

    if (loading.value) {
      instance.showLoading(loadingOptions?.value);
    } else {
      instance.hideLoading();
    }
  });
}

export const loadingProps = {
  loading: Boolean,
  loadingOptions: Object
};
