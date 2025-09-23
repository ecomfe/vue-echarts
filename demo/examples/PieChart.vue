<script setup lang="ts">
import { use } from "echarts/core";
import { PieChart } from "echarts/charts";
import {
  PolarComponent,
  TitleComponent,
  LegendComponent,
  TooltipComponent,
} from "echarts/components";
import { shallowRef, onMounted, onUnmounted } from "vue";
import type { Option } from "../../src/types";
import type { PieSeriesOption } from "echarts/charts";
import VChart from "../../src/ECharts";
import VExample from "./Example.vue";
import getData from "../data/pie";

use([
  PieChart,
  PolarComponent,
  TitleComponent,
  LegendComponent,
  TooltipComponent,
]);

type ChartInstance = InstanceType<typeof VChart>;

const option = shallowRef<Option>(getData());
const pie = shallowRef<ChartInstance | null>(null);

let timer: number | undefined;

function getPieSeries(option: Option | undefined): PieSeriesOption | null {
  if (!option) {
    return null;
  }
  const series = option.series;
  const firstSeries = Array.isArray(series) ? series[0] : series;
  if (!firstSeries || typeof firstSeries !== "object") {
    return null;
  }
  if ((firstSeries as PieSeriesOption).type === "pie") {
    return firstSeries as PieSeriesOption;
  }
  return null;
}

onMounted(() => {
  startActions();
});

onUnmounted(() => {
  stopActions();
});

function startActions(): void {
  let dataIndex = -1;

  const series = getPieSeries(option.value);
  const data = Array.isArray(series?.data) ? series.data : [];
  const dataLen = data.length;

  if (!pie.value || dataLen === 0) {
    return;
  }

  clearInterval(timer);

  timer = window.setInterval(() => {
    const chart = pie.value;
    if (!chart) {
      if (timer !== undefined) {
        clearInterval(timer);
        timer = undefined;
      }
      return;
    }

    chart.dispatchAction({
      type: "downplay",
      seriesIndex: 0,
      dataIndex,
    });
    dataIndex = (dataIndex + 1) % dataLen;
    chart.dispatchAction({
      type: "highlight",
      seriesIndex: 0,
      dataIndex,
    });
    chart.dispatchAction({
      type: "showTip",
      seriesIndex: 0,
      dataIndex,
    });
  }, 1000);
}

function stopActions(): void {
  if (timer !== undefined) {
    clearInterval(timer);
    timer = undefined;
  }
}
</script>

<template>
  <VExample id="pie" title="Pie chart" desc="action dispatch">
    <VChart ref="pie" :option="option" autoresize />
  </VExample>
</template>
