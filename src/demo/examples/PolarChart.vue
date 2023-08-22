<script setup>
import { use } from "echarts/core";
import { LineChart } from "echarts/charts";
import {
  PolarComponent,
  TitleComponent,
  LegendComponent,
  TooltipComponent
} from "echarts/components";
import { shallowRef } from "vue";
import VChart from "../../ECharts";
import VExample from "./Example";
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
</script>

<template>
  <v-example id="polar" title="Polar plot" desc="(with built-in theme)">
    <v-chart
      :option="option"
      autoresize
      :theme="theme"
      :style="theme === 'dark' ? 'background-color: #100c2a' : ''"
    />
    <template #extra>
      <p class="actions">
        Theme
        <select v-model="theme">
          <option :value="null">Default</option>
          <option value="dark">Dark</option>
        </select>
      </p>
    </template>
  </v-example>
</template>
