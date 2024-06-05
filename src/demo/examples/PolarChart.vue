<script setup>
import { use } from "echarts/core";
import { LineChart } from "echarts/charts";
import {
  PolarComponent,
  TitleComponent,
  LegendComponent,
  TooltipComponent
} from "echarts/components";
import VChart from "../../ECharts";
import VExample from "./Example";
import getData from "../data/polar";
import { LOADING_OPTIONS_KEY } from "@/ECharts.ts";
import { watchEffect, provide, shallowRef } from "vue-demi";

use([
  LineChart,
  PolarComponent,
  TitleComponent,
  LegendComponent,
  TooltipComponent
]);

const option = shallowRef(getData());
const theme = shallowRef("dark");
const load = shallowRef(true);


const loadOptions = shallowRef({
  text: '',
  color: '#409eff',
  textColor: '#000',
  maskColor: 'rgba(255, 255, 255, 0.8)',
  zlevel: 0,

  // 字体大小。从 `v4.8.0` 开始支持。
  fontSize: 12,
  // 是否显示旋转动画（spinner）。从 `v4.8.0` 开始支持。
  showSpinner: true,
  // 旋转动画（spinner）的半径。从 `v4.8.0` 开始支持。
  spinnerRadius: 17,
  // 旋转动画（spinner）的线宽。从 `v4.8.0` 开始支持。
  lineWidth: 2,
  // 字体粗细。从 `v5.0.1` 开始支持。
  fontWeight: 'normal',
  // 字体风格。从 `v5.0.1` 开始支持。
  fontStyle: 'normal',
  // 字体系列。从 `v5.0.1` 开始支持。
  fontFamily: 'sans-serif'
});

watchEffect(() => {
  load.value = true;
  loadOptions.value.maskColor = theme.value==='dark' ? '#1f1f1f' : 'rgba(255, 255, 255, 0.8)'
  option.value = getData();
  setTimeout(() => (load.value = false), 1000);
})

provide(LOADING_OPTIONS_KEY, loadOptions);

</script>

<template>
  <v-example id="polar" title="Polar plot" desc="(with built-in theme)">
    <v-chart
      :option="option"
      autoresize
      :theme="theme"
      :loading="load"
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
