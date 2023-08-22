<script setup>
import { use } from "echarts/core";
import { RadarChart } from "echarts/charts";
import {
  PolarComponent,
  TitleComponent,
  TooltipComponent
} from "echarts/components";
import { shallowRef } from "vue";
import VChart from "../../ECharts";
import VExample from "./Example";
import { useScoreStore } from "../data/radar";

use([RadarChart, PolarComponent, TitleComponent, TooltipComponent]);

const { metrics, getRadarData, increase, isMax, isMin } = useScoreStore();

const metricIndex = shallowRef(0);
</script>

<template>
  <v-example id="radar" title="Radar chart" desc="(with Pinia integration)">
    <v-chart :option="getRadarData(metricIndex)" autoresize />
    <template #extra>
      <p class="actions">
        <select v-model="metricIndex">
          <option
            v-for="(metric, index) in metrics"
            :value="index"
            :key="index"
          >
            {{ metric }}
          </option>
        </select>
        <button
          @click="increase(metricIndex, 1)"
          :disabled="isMax(metricIndex)"
        >
          Increase
        </button>
        <button
          @click="increase(metricIndex, -1)"
          :disabled="isMin(metricIndex)"
        >
          Decrease
        </button>
      </p>
    </template>
  </v-example>
</template>
