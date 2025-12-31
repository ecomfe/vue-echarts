<script setup lang="ts">
import { use, connect, disconnect } from "echarts/core";
import { ScatterChart } from "echarts/charts";
import {
  GridComponent,
  TitleComponent,
  VisualMapComponent,
  TooltipComponent,
} from "echarts/components";
import { shallowRef, watchEffect } from "vue";
import type { Option } from "../../src/types";
import VChart from "../../src/ECharts";
import VExample from "./Example.vue";
import getData from "../data/connect";

use([ScatterChart, GridComponent, TitleComponent, VisualMapComponent, TooltipComponent]);

const [firstOption, secondOption] = getData();
const c1 = shallowRef<Option>(firstOption);
const c2 = shallowRef<Option>(secondOption);
const connected = shallowRef(true);

watchEffect((onCleanup) => {
  if (connected.value) {
    connect("radiance");
    onCleanup(() => {
      disconnect("radiance");
    });
    return;
  }
  disconnect("radiance");
});
</script>

<template>
  <VExample id="connect" title="Connectable charts" split>
    <template #start>
      <VChart :option="c1" group="radiance" autoresize />
    </template>
    <template #end>
      <VChart :option="c2" group="radiance" autoresize />
    </template>
    <template #extra>
      <p class="actions">
        <input id="connected-check" v-model="connected" type="checkbox" />
        <label for="connected-check">Connected</label>
      </p>
    </template>
  </VExample>
</template>
