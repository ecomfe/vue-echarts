<script setup lang="ts">
import { use, registerMap } from "echarts/core";
import { ScatterChart, EffectScatterChart } from "echarts/charts";
import {
  GeoComponent,
  TitleComponent,
  LegendComponent,
  TooltipComponent,
} from "echarts/components";
import { shallowRef } from "vue";
import VChart from "../../src/ECharts";
import VExample from "./Example.vue";
import getData from "../data/map";
import chinaMap from "../data/china.json";
import { isGeoJSONSource } from "../utils/geo";

use([
  ScatterChart,
  EffectScatterChart,
  GeoComponent,
  TitleComponent,
  LegendComponent,
  TooltipComponent,
]);

const chinaGeoJSON = isGeoJSONSource(chinaMap) ? chinaMap : null;

if (chinaGeoJSON) {
  registerMap("china", chinaGeoJSON);
}

type ChartInstance = InstanceType<typeof VChart>;

interface Snapshot {
  src: string;
  width: number;
  height: number;
}

const option = shallowRef(getData());
const map = shallowRef<ChartInstance | null>(null);
const isModalOpen = shallowRef(false);
const snapshot = shallowRef<Snapshot | null>(null);

function convert(): void {
  const chart = map.value;
  if (!chart) {
    return;
  }
  snapshot.value = {
    src: chart.getDataURL({ pixelRatio: window.devicePixelRatio || 1 }),
    width: chart.getWidth(),
    height: chart.getHeight(),
  };
  isModalOpen.value = true;
}
</script>

<template>
  <VExample id="map" title="Map" desc="GeoJSON · image converter">
    <VChart
      ref="map"
      :option="option"
      autoresize
      style="background-color: #404a59"
    />
    <template #extra>
      <p class="actions">
        <button @click="convert">Convert to image</button>
      </p>
      <aside
        class="modal"
        :class="{ open: isModalOpen }"
        @click="isModalOpen = false"
      >
        <img
          v-if="snapshot"
          :src="snapshot.src"
          :width="snapshot.width"
          :height="snapshot.height"
        />
      </aside>
    </template>
  </VExample>
</template>
