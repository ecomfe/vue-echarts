<script setup lang="ts">
import { use } from "echarts/core";
import { LineChart, PieChart } from "echarts/charts";
import {
  GridComponent,
  DatasetComponent,
  LegendComponent,
  TooltipComponent,
  ToolboxComponent,
} from "echarts/components";
import { shallowRef, ref } from "vue";
import type { Option } from "../../src/types";
import VChart from "../../src/ECharts";
import VExample from "./Example.vue";
import getData from "../data/line";
import { DEMO_FONT_FAMILY } from "../constants";

use([
  DatasetComponent,
  GridComponent,
  LegendComponent,
  LineChart,
  TooltipComponent,
  ToolboxComponent,
  PieChart,
]);

const option = shallowRef<Option>(getData());
const axis = ref<"xAxis" | "yAxis">("xAxis");

function isStringOrNumber(value: unknown): value is string | number {
  return typeof value === "string" || typeof value === "number";
}

function isDataRow(value: unknown): value is (string | number)[] {
  return Array.isArray(value) && value.every(isStringOrNumber);
}

type TooltipParams = unknown;

interface TooltipDatumLike {
  dimensionNames?: unknown;
  data?: unknown;
  name?: unknown;
}

function firstTooltipDatum(
  params: TooltipParams,
): TooltipDatumLike | undefined {
  if (Array.isArray(params)) {
    const [first] = params;
    return first as TooltipDatumLike | undefined;
  }
  if (params && typeof params === "object" && "data" in params) {
    return params as TooltipDatumLike;
  }
  return undefined;
}

function getPieOption(params: TooltipParams): Option {
  const datum = firstTooltipDatum(params);
  if (
    !datum ||
    !Array.isArray(datum.dimensionNames) ||
    !isDataRow(datum.data)
  ) {
    return { series: [] } satisfies Option;
  }

  const dimensionNames = datum.dimensionNames.map((value) => String(value));
  const dataRow = datum.data;

  return {
    textStyle: {
      fontFamily: DEMO_FONT_FAMILY,
      fontWeight: 400,
    },
    dataset: { source: [dimensionNames, dataRow] },
    series: [
      {
        type: "pie",
        radius: ["60%", "100%"],
        seriesLayoutBy: "row",
        itemStyle: {
          borderRadius: 4,
        },
        label: {
          position: "center",
          formatter: datum.name ?? "",
          fontFamily: DEMO_FONT_FAMILY,
          fontWeight: 600,
        },
      },
    ],
  } satisfies Option;
}

function getAxisLabel(params: TooltipParams): string {
  if (Array.isArray(params)) {
    const [first] = params;
    if (first && typeof first === "object" && "name" in first) {
      return String((first as { name?: unknown }).name ?? "");
    }
    return "";
  }
  if (params && typeof params === "object" && "name" in params) {
    return String((params as { name?: unknown }).name ?? "");
  }
  return "";
}

function getDatasetRows(option: Option): Array<string | number>[] {
  const rawDataset = option.dataset;
  if (!Array.isArray(rawDataset) || rawDataset.length === 0) {
    return [];
  }

  const firstDataset = rawDataset[0] as { source?: unknown };
  const { source } = firstDataset;
  if (!Array.isArray(source) || source.length === 0) {
    return [];
  }

  if (!source.every(isDataRow)) {
    return [];
  }

  return source as Array<string | number>[];
}
</script>

<template>
  <VExample id="line" title="Line chart" desc="tooltip · dataView">
    <VChart :option="option" autoresize>
      <template #tooltip="params">
        <VChart
          :style="{ width: '100px', height: '100px' }"
          :option="{ ...getPieOption(params), backgroundColor: 'transparent' }"
        />
      </template>
      <template #[`tooltip-${axis}`]="params">
        {{ axis === "xAxis" ? "Year" : "Value" }}:
        <b>{{ getAxisLabel(params) }}</b>
      </template>
      <template #dataView="chartOption">
        <table
          v-if="getDatasetRows(chartOption).length"
          style="margin: var(--space-5) auto"
        >
          <thead>
            <tr>
              <th v-for="(t, i) in getDatasetRows(chartOption)[0]" :key="i">
                {{ t }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, rowIndex) in getDatasetRows(chartOption).slice(1)"
              :key="rowIndex"
            >
              <th>{{ row[0] }}</th>
              <td v-for="(value, cellIndex) in row.slice(1)" :key="cellIndex">
                {{ value }}
              </td>
            </tr>
          </tbody>
        </table>
      </template>
    </VChart>
    <template #extra>
      <p class="actions">
        Tooltip axis
        <select v-model="axis">
          <option value="xAxis">X axis</option>
          <option value="yAxis">Y axis</option>
        </select>
      </p>
    </template>
  </VExample>
</template>

<style scoped>
th,
td {
  padding: var(--space-1) var(--space-2);
}
</style>
