<script setup>
import { use, connect, disconnect } from "echarts/core";
import { ScatterChart } from "echarts/charts";
import {
  GridComponent,
  TitleComponent,
  VisualMapComponent,
  TooltipComponent
} from "echarts/components";
import { shallowRef, watch } from "vue";
import VChart from "../../ECharts";
import VExample from "./Example";
import getData from "../data/connect";

use([
  ScatterChart,
  GridComponent,
  TitleComponent,
  VisualMapComponent,
  TooltipComponent
]);

const [c1, c2] = getData().map(shallowRef);
const connected = shallowRef(true);

watch(
  connected,
  value => {
    if (value) {
      connect("radiance");
    } else {
      disconnect("radiance");
    }
  },
  { immediate: true }
);
</script>

<template>
  <v-example id="connect" title="Connectable charts" split>
    <template #start>
      <v-chart :option="c1" group="radiance" autoresize />
    </template>
    <template #end>
      <v-chart :option="c2" group="radiance" autoresize />
    </template>
    <template #extra>
      <p>
        <label>
          <input type="checkbox" v-model="connected" />
          Connected
        </label>
      </p>
    </template>
  </v-example>
</template>
