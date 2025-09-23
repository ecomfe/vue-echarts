<script setup lang="ts">
import { use } from "echarts/core";
import { LineChart } from "echarts/charts";
import {
  PolarComponent,
  TitleComponent,
  LegendComponent,
  TooltipComponent,
} from "echarts/components";
import { computed, shallowRef, watch } from "vue";
import type { LoadingOptions, Option, Theme } from "../../src/types";
import VChart from "../../src/ECharts";
import VExample from "./Example.vue";
import getData from "../data/polar";
import { useDemoDark } from "../composables/useDemoDark";

use([
  LineChart,
  PolarComponent,
  TitleComponent,
  LegendComponent,
  TooltipComponent,
]);

const isDark = useDemoDark();
const themeSelection = shallowRef<"dark" | "default">(
  isDark.value ? "dark" : "default",
);
const option = shallowRef<Option>(getData());
const loading = shallowRef(false);

const theme = computed<Theme | undefined>(() =>
  themeSelection.value === "dark" ? "dark" : undefined,
);

const loadingOptions = computed<LoadingOptions | undefined>(() =>
  themeSelection.value === "dark"
    ? {
        color: "#fff",
        textColor: "#fff",
        maskColor: "rgba(0, 0, 0, 0.7)",
      }
    : undefined,
);

const chartStyle = computed(() => {
  if (themeSelection.value !== "dark") {
    return "";
  }
  return loading.value
    ? "background-color: #05040d"
    : "background-color: #100c2a";
});

watch(isDark, (value) => {
  themeSelection.value = value ? "dark" : "default";
});
</script>

<template>
  <VExample id="polar" title="Polar plot" desc="built-in theme">
    <VChart
      :option="option"
      autoresize
      :loading="loading"
      :loading-options="loadingOptions"
      :theme="theme"
      :style="chartStyle"
    />
    <template #extra>
      <p class="actions">
        Theme
        <select v-model="themeSelection">
          <option value="default">Default</option>
          <option value="dark">Dark</option>
        </select>
        <input id="loading-check" v-model="loading" type="checkbox" />
        <label for="loading-check">Loading</label>
      </p>
    </template>
  </VExample>
</template>
