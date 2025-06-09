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
import { createTooltipTemplate } from "../../src/composables/tooltip";
import VExample from "./Example.vue";

use([
  DatasetComponent,
  GridComponent,
  LegendComponent,
  LineChart,
  TooltipComponent,
  PieChart,
]);

const { define: DefineTooltip, formatter } = createTooltipTemplate();

const option = shallowRef({
  legend: { top: 20 },
  tooltip: {
    trigger: "axis",
    formatter: (params) => {
      const source = [params[0].dimensionNames, params[0].data];
      const dataset = { source };
      const option = { ...pieOption, dataset };
      option.series[0].label.formatter = params[0].name;
      return formatter(option);
    },
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

const pieOption = {
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
      label: { position: "center" },
    },
  ],
};
</script>

<template>
  <v-example
    id="line"
    title="Line chart"
    desc="(with component rendered tooltip)"
  >
    <v-chart :option="option" autoresize />
    <define-tooltip v-slot="opt">
      <v-chart
        :style="{ width: '100px', height: '100px' }"
        :option="opt"
        :update-options="{ notMerge: false }"
        autoresize
      />
    </define-tooltip>
  </v-example>
</template>
