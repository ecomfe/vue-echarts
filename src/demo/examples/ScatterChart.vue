<script setup>
import { use } from "echarts/core";
import { ScatterChart } from "echarts/charts";
import {
  GridComponent,
  TitleComponent,
  LegendComponent
} from "echarts/components";
import { shallowRef } from "vue";
import VChart from "../../ECharts";
import VExample from "./Example.vue";
import getData from "../data/scatter";

use([ScatterChart, GridComponent, TitleComponent, LegendComponent]);

const option = shallowRef(getData());
</script>

<template>
  <v-example id="scatter" title="Scatter plot" desc="(with gradient)">
    <v-chart :option="option" autoresize />
  </v-example>
</template>
