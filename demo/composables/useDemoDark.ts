import { useDark } from "@vueuse/core";

export function useDemoDark() {
  return useDark({
    storageKey: "vue-echarts-demo-theme",
    valueLight: "light",
    valueDark: "dark",
    disableTransition: false,
  });
}
