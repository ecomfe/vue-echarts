<script setup>
import { use, registerMap } from "echarts/core";
import { ScatterChart, EffectScatterChart } from "echarts/charts";
import {
  GeoComponent,
  TitleComponent,
  LegendComponent,
  TooltipComponent
} from "echarts/components";
import { shallowRef } from "vue";
import VChart from "../../src/ECharts";
import VExample from "./Example.vue";
import getData from "../data/map";
import chinaMap from "../data/china.json";

use([
  ScatterChart,
  EffectScatterChart,
  GeoComponent,
  TitleComponent,
  LegendComponent,
  TooltipComponent
]);

registerMap("china", chinaMap);

const option = shallowRef(getData());
const map = shallowRef(null);
const open = shallowRef(false);

let img = null;

function convert() {
  img = {
    src: map.value.getDataURL({
      pixelRatio: window.devicePixelRatio || 1
    }),
    width: map.value.getWidth(),
    height: map.value.getHeight()
  };
  open.value = true;
}
</script>

<template>
  <v-example id="map" title="Map" desc="(with GeoJSON & image converter)">
    <v-chart
      ref="map"
      :option="option"
      autoresize
      style="background-color: #404a59"
    />
    <template #extra>
      <p class="actions">
        <button @click="convert">Convert to image</button>
      </p>
      <aside class="modal" :class="{ open }" @click="open = false">
        <img v-if="img" v-bind="img" />
      </aside>
    </template>
  </v-example>
</template>
