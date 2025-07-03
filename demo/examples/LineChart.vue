<script setup>
import { use } from "echarts/core";
import { LineChart, PieChart } from "echarts/charts";
import {
  GridComponent,
  DatasetComponent,
  LegendComponent,
  TooltipComponent,
} from "echarts/components";
import { shallowRef } from "vue";
import VChart from "../../src/ECharts";
import VExample from "./Example.vue";
import getData from "../data/line";

use([
  DatasetComponent,
  GridComponent,
  LegendComponent,
  LineChart,
  TooltipComponent,
  PieChart,
]);

const option = shallowRef(getData());
const axis = shallowRef("xAxis");

function getPieOption(params) {
  const option = {
    dataset: { source: [params[0].dimensionNames, params[0].data] },
    series: [
      {
        type: "pie",
        radius: ["60%", "100%"],
        seriesLayoutBy: "row",
        itemStyle: {
          borderRadius: 5,
          borderColor: "#fff",
          borderWidth: 2,
        },
        label: {
          position: "center",
          formatter: params[0].name,
          textStyle: {
            fontFamily: 'Inter, "Helvetica Neue", Arial, sans-serif',
            fontWeight: 300,
          },
        },
      },
    ],
  };
  return option;
}
</script>

<template>
  <v-example
    id="line"
    title="Line chart"
    desc="(with component rendered tooltip)"
  >
    <v-chart :option="option" autoresize>
      <template #tooltip="{ params }">
        <v-chart
          :style="{ width: '100px', height: '100px' }"
          :option="getPieOption(params)"
          autoresize
        />
      </template>
      <template #[`tooltip-${axis}`]="{ params }">
        {{ axis === "xAxis" ? "Year" : "Value" }}:
        <b>{{ params.name }}</b>
      </template>
    </v-chart>
    <template #extra>
      <p class="actions">
        Custom tooltip on
        <select v-model="axis">
          <option value="xAxis">X Axis</option>
          <option value="yAxis">Y Axis</option>
        </select>
      </p>
    </template>
  </v-example>
</template>
