<script setup>
import { use } from "echarts/core";
import { PieChart } from "echarts/charts";
import {
  PolarComponent,
  TitleComponent,
  LegendComponent,
  TooltipComponent,
} from "echarts/components";
import { shallowRef, onMounted, onUnmounted } from "vue";
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

const option = shallowRef(getData());
const pie = shallowRef(null);

let timer = null;

onMounted(() => {
  startActions();
});

onUnmounted(() => {
  stopActions();
});

function startActions() {
  let dataIndex = -1;

  const dataLen = option.value?.series?.[0]?.data?.length || 0;

  if (!pie.value || dataLen === 0) {
    return;
  }

  clearInterval(timer);

  timer = setInterval(() => {
    if (!pie.value) {
      clearInterval(timer);

      return;
    }

    pie.value.dispatchAction({
      type: "downplay",
      seriesIndex: 0,
      dataIndex,
    });
    dataIndex = (dataIndex + 1) % dataLen;
    pie.value.dispatchAction({
      type: "highlight",
      seriesIndex: 0,
      dataIndex,
    });
    pie.value.dispatchAction({
      type: "showTip",
      seriesIndex: 0,
      dataIndex,
    });
  }, 1000);
}

function stopActions() {
  clearInterval(timer);
}
</script>

<template>
  <v-example id="pie" title="Pie chart" desc="(with action dispatch)">
    <v-chart ref="pie" :option="option" autoresize />
  </v-example>
</template>
