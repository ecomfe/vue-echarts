<script setup lang="ts">
import { use, registerTheme } from "echarts/core";
import { BarChart } from "echarts/charts";
import { GridComponent, DatasetComponent } from "echarts/components";
import { shallowRef, computed } from "vue";
import { useIntervalFn } from "@vueuse/core";
import type { LoadingOptions } from "../../src/types";
import VChart from "../../src/ECharts";
import VExample from "./Example.vue";
import getData from "../data/bar";
import theme from "../theme.json";
import darkTheme from "../theme-dark.json";
import { useDemoDark } from "../composables/useDemoDark";

use([BarChart, DatasetComponent, GridComponent]);
registerTheme("ovilia-green", theme);
registerTheme("ovilia-green-dark", darkTheme);

const seconds = shallowRef(0);
const loading = shallowRef(false);
const isDark = useDemoDark();
const loadingOptions = computed(
  () =>
    ({
      text: "Loading…",
      textColor: isDark.value ? "#e5e7eb" : "#111827",
      color: "#42b883",
      maskColor: isDark.value
        ? "rgba(0, 0, 0, 0.45)"
        : "rgba(255, 255, 255, 0.5)",
    }) satisfies LoadingOptions,
);
const option = shallowRef(getData());

const { pause, resume } = useIntervalFn(
  () => {
    if (seconds.value <= 0) {
      pause();
      return;
    }
    seconds.value -= 1;
    if (seconds.value === 0) {
      loading.value = false;
      option.value = getData();
      pause();
    }
  },
  1000,
  { immediate: false },
);

function refresh() {
  seconds.value = 3;
  loading.value = true;
  pause();
  resume();
}
</script>

<template>
  <VExample id="bar" title="Bar chart" desc="async data · custom theme">
    <VChart
      :option="option"
      autoresize
      :theme="isDark ? 'ovilia-green-dark' : 'ovilia-green'"
      :loading="loading"
      :loading-options="loadingOptions"
    />
    <template #extra>
      <p v-if="seconds <= 0">
        <small>Loaded.</small>
      </p>
      <p v-else>
        <small>
          Data coming in
          <b>{{ seconds }}</b>
          second{{ seconds > 1 ? "s" : "" }}...
        </small>
      </p>
      <p class="actions">
        <button :disabled="seconds > 0" @click="refresh">Refresh</button>
      </p>
    </template>
  </VExample>
</template>
