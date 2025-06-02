<script setup>
import { use } from "echarts/core";
import { LineChart } from "echarts/charts";
import {
  GridComponent,
  DatasetComponent,
  LegendComponent,
  TooltipComponent,
} from "echarts/components";
import { shallowRef } from "vue";
import VChart from "../../src/ECharts";
import VExample from "./Example.vue";

use([
  DatasetComponent,
  GridComponent,
  LegendComponent,
  LineChart,
  TooltipComponent,
]);

const option = shallowRef({
  legend: { top: 20 },
  tooltip: {
    trigger: "axis",
    showContent: false,
  },
  dataset: {
    source: [
      ["product", "2012", "2013", "2014", "2015", "2016", "2017"],
      ["Milk Tea", 56.5, 82.1, 88.7, 70.1, 53.4, 85.1],
      ["Matcha Latte", 51.1, 51.4, 55.1, 53.3, 73.8, 68.7],
      ["Cheese Cocoa", 40.1, 62.2, 69.5, 36.4, 45.2, 32.5],
      ["Walnut Brownie", 25.2, 37.1, 41.2, 18, 33.9, 49.1],
    ],
  },
  xAxis: { type: "category" },
  yAxis: {},
  series: [
    {
      type: "line",
      smooth: true,
      seriesLayoutBy: "row",
      emphasis: { focus: "series" },
    },
    {
      type: "line",
      smooth: true,
      seriesLayoutBy: "row",
      emphasis: { focus: "series" },
    },
    {
      type: "line",
      smooth: true,
      seriesLayoutBy: "row",
      emphasis: { focus: "series" },
    },
    {
      type: "line",
      smooth: true,
      seriesLayoutBy: "row",
      emphasis: { focus: "series" },
    },
  ],
});
</script>

<template>
  <v-example
    id="line"
    title="Line chart"
    desc="(with component rendered tooltip)"
  >
    <v-chart :option="option" autoresize>
      <template #tooltip="{ params, show }">
        <div
          v-if="show"
          :style="{
            position: 'absolute',
            top: '0px',
            left: '0px',
            transform: `translate3d(${params.x + 20}px, ${params.y + 20}px, 0px)`,
            zIndex: 1000,
            pointerEvents: 'none',
            transition:
              'opacity 0.2s cubic-bezier(0.23, 1, 0.32, 1), visibility 0.2s cubic-bezier(0.23, 1, 0.32, 1), transform 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
          }"
        >
          <div
            style="
              background: rgba(255, 255, 255, 0.2);
              padding: 10px;
              border-radius: 4px;
              border: 1px solid rgb(102, 102, 102);
              will-change: transform;
              backdrop-filter: blur(8px);
              box-shadow: rgba(0, 0, 0, 0.2) 1px 2px 10px;
            "
          >
            {{ params }}
          </div>
        </div>
      </template>
    </v-chart>
  </v-example>
</template>
