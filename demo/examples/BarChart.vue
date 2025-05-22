<script setup>
import { use, registerTheme } from "echarts/core";
import { BarChart } from "echarts/charts";
import { GridComponent, DatasetComponent } from "echarts/components";
import { shallowRef, onBeforeUnmount } from "vue";
import VChart from "../../src/ECharts";
import VExample from "./Example.vue";
import getData from "../data/bar";
import theme from "../theme.json";

use([BarChart, DatasetComponent, GridComponent]);
registerTheme("ovilia-green", theme);

const seconds = shallowRef(0);
const loading = shallowRef(false);
const loadingOptions = {
  text: "Loading…",
  color: "#4ea397",
  maskColor: "rgba(255, 255, 255, 0.4)"
};
const option = shallowRef(getData());

let timer = null;

onBeforeUnmount(() => {
  clearInterval(timer);
});

function tick() {
  seconds.value--;

  if (seconds.value === 0) {
    clearInterval(timer);
    loading.value = false;
    option.value = getData();
  }
}

function refresh() {
  // simulating async data from server
  seconds.value = 3;
  loading.value = true;

  timer = setInterval(tick, 1000);
}
</script>

<template>
  <v-example
    id="bar"
    title="Bar chart"
    desc="(with async data &amp; custom theme)"
  >
    <v-chart
      :option="option"
      theme="ovilia-green"
      autoresize
      :loading="loading"
      :loadingOptions="loadingOptions"
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
        <button @click="refresh" :disabled="seconds > 0">Refresh</button>
      </p>
    </template>
  </v-example>
</template>
