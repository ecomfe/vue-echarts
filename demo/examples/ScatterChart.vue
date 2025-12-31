<script setup lang="ts">
import { use } from "echarts/core";
import { ScatterChart } from "echarts/charts";
import {
  GridComponent,
  TitleComponent,
  LegendComponent,
  TooltipComponent,
} from "echarts/components";
import { shallowRef } from "vue";
import type { Option } from "../../src/types";
import VChart from "../../src/ECharts";
import VExample from "./Example.vue";
import getData from "../data/scatter";

use([ScatterChart, GridComponent, TitleComponent, LegendComponent, TooltipComponent]);

const option = shallowRef<Option>(getData());
</script>

<template>
  <VExample id="scatter" title="Scatter plot" desc="gradient">
    <VChart :option="option" autoresize />
  </VExample>
</template>
