<script setup>
import { use } from "echarts/core";
import { LineChart } from "echarts/charts";
import {
  PolarComponent,
  TitleComponent,
  LegendComponent,
  TooltipComponent
} from "echarts/components";
import { computed, shallowRef } from "vue";
import VChart from "../../src/ECharts";
import VExample from "./Example.vue";
import getData from "../data/polar";

use([
  LineChart,
  PolarComponent,
  TitleComponent,
  LegendComponent,
  TooltipComponent
]);

const option = shallowRef(getData());
const theme = shallowRef("dark");
const loading = shallowRef(false);
const loadingOptions = computed(() =>
  theme.value === "dark"
    ? {
        color: "#fff",
        textColor: "#fff",
        maskColor: "rgba(0, 0, 0, 0.7)"
      }
    : null
);
const style = computed(() => {
  return theme.value === "dark"
    ? loading.value
      ? "background-color: #05040d"
      : "background-color: #100c2a"
    : "";
});
</script>

<template>
  <v-example id="polar" title="Polar plot" desc="(with built-in theme)">
    <v-chart
      :option="option"
      autoresize
      :loading="loading"
      :loading-options="loadingOptions"
      :theme="theme"
      :style="style"
    />
    <template #extra>
      <p class="actions">
        Theme
        <select v-model="theme">
          <option :value="null">Default</option>
          <option value="dark">Dark</option>
        </select>
        <input id="loading-check" type="checkbox" v-model="loading" />
        <label for="loading-check">Loading</label>
      </p>
    </template>
  </v-example>
</template>
