<script setup lang="ts">
import { use } from "echarts/core";
import { RadarChart } from "echarts/charts";
import { PolarComponent, TitleComponent, TooltipComponent } from "echarts/components";
import { computed, shallowRef } from "vue";
import VChart from "../../src/ECharts";
import VExample from "./Example.vue";
import { useScoreStore } from "../data/radar";

use([RadarChart, PolarComponent, TitleComponent, TooltipComponent]);

const { metrics, getRadarData, increase, isMax, isMin } = useScoreStore();
const metricIndex = shallowRef(0);

const option = computed(() => getRadarData(metricIndex.value));
</script>

<template>
  <VExample id="radar" title="Radar chart" desc="Pinia integration">
    <VChart :option="option" autoresize />
    <template #extra>
      <p class="actions">
        <select v-model.number="metricIndex">
          <option v-for="(metric, index) in metrics" :key="index" :value="index">
            {{ metric }}
          </option>
        </select>
        <button :disabled="isMax(metricIndex)" @click="increase(metricIndex, 1)">Increase</button>
        <button :disabled="isMin(metricIndex)" @click="increase(metricIndex, -1)">Decrease</button>
      </p>
    </template>
  </VExample>
</template>
