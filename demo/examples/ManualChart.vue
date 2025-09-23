<script setup lang="ts">
import { use, registerMap } from "echarts/core";
import { LinesChart } from "echarts/charts";
import {
  GeoComponent,
  TitleComponent,
  TooltipComponent,
} from "echarts/components";
import { shallowRef } from "vue";
import type { InitOptions, LoadingOptions, Option } from "../../src/types";
import VChart from "../../src/ECharts";
import VExample from "./Example.vue";
import worldMap from "../data/world.json";
import { DEMO_TEXT_STYLE } from "../constants";
import { isGeoJSONSource } from "../utils/geo";

use([LinesChart, GeoComponent, TitleComponent, TooltipComponent]);

const worldGeoJSON = isGeoJSONSource(worldMap) ? worldMap : null;

if (worldGeoJSON) {
  registerMap("world", worldGeoJSON);
}

type ChartInstance = InstanceType<typeof VChart>;

interface FlightDataset {
  airports: Array<[string, string, string, number, number]>;
  routes: Array<[number, number, number, number]>;
}

function isFlightDataset(value: unknown): value is FlightDataset {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as Record<string, unknown>).airports) &&
    Array.isArray((value as Record<string, unknown>).routes)
  );
}

const chart = shallowRef<ChartInstance | null>(null);
const loading = shallowRef(false);
const loaded = shallowRef(false);

const loadingOptions: LoadingOptions = {
  text: "",
  color: "#c23531",
  textColor: "rgba(255, 255, 255, 0.5)",
  maskColor: "#003",
  zlevel: 0,
};

const initOptions: InitOptions = {
  renderer: "canvas",
};

function load(): void {
  loaded.value = true;
  loading.value = true;

  import("../data/flight.json").then(({ default: rawData }) => {
    if (!isFlightDataset(rawData)) {
      loading.value = false;
      return;
    }

    loading.value = false;

    const getAirportCoord = (index: number): [number, number] => [
      rawData.airports[index][3],
      rawData.airports[index][4],
    ];

    type Route = [[number, number], [number, number]];
    const routes = rawData.routes.map<Route>(([, from, to]) => {
      const fromCoord = getAirportCoord(from);
      const toCoord = getAirportCoord(to);
      return [fromCoord, toCoord];
    });

    chart.value?.setOption({
      textStyle: { ...DEMO_TEXT_STYLE },
      title: {
        text: "World Flights",
        top: "5%",
        left: "center",
        textStyle: {
          color: "#eee",
        },
      },
      backgroundColor: "#003",
      tooltip: {
        formatter({ dataIndex }: { dataIndex: number }) {
          const route = rawData.routes[dataIndex];
          const fromName = rawData.airports[route[1]][1];
          const toName = rawData.airports[route[2]][1];
          return `${fromName} > ${toName}`;
        },
      },
      geo: {
        map: "world",
        top: "15%",
        right: "5%",
        bottom: "5%",
        left: "5%",
        silent: true,
        itemStyle: {
          borderColor: "#003",
          color: "#005",
        },
      },
      series: [
        {
          type: "lines",
          coordinateSystem: "geo",
          data: routes,
          lineStyle: {
            opacity: 0.05,
            width: 0.5,
            curveness: 0.3,
          },
          blendMode: "lighter",
        },
      ],
    } satisfies Option);
  });
}
</script>

<template>
  <VExample id="manual" title="Manual updates">
    <VChart
      ref="chart"
      autoresize
      :loading="loading"
      :loading-options="loadingOptions"
      :init-options="initOptions"
      style="background-color: #003"
      manual-update
    />
    <template #extra>
      <p>
        You may use the <code>manual-update</code> prop for performance critical
        use cases.
      </p>
      <p class="actions">
        <button :disabled="loaded" @click="load">Load</button>
      </p>
    </template>
  </VExample>
</template>
