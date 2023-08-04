<script setup>
import { registerTheme } from "echarts/core";

import "echarts-liquidfill";
import VChart from "../../ECharts";
import theme from "../theme.json";
import logo from "../data/logo";

registerTheme("ovilia-green", theme);
</script>

<template>
  <v-chart id="logo" :option="logo" />
</template>
