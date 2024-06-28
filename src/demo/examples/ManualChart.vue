<script setup>
import { use, registerMap } from "echarts/core";
import { LinesChart } from "echarts/charts";
import {
  GeoComponent,
  TitleComponent,
  TooltipComponent
} from "echarts/components";
import { shallowRef } from "vue";
import VChart from "../../ECharts";
import VExample from "./Example";
import worldMap from "../world.json";

use([LinesChart, GeoComponent, TitleComponent, TooltipComponent]);
registerMap("world", worldMap);

const chart = shallowRef(null);
const loading = shallowRef(false);
const loaded = shallowRef(false);

const loadingOptions = {
  text: "",
  color: "#c23531",
  textColor: "rgba(255, 255, 255, 0.5)",
  maskColor: "#003",
  zlevel: 0
};

function load() {
  loaded.value = true;
  loading.value = true;

  import("../data/flight.json").then(({ default: data }) => {
    loading.value = false;

    function getAirportCoord(idx) {
      return [data.airports[idx][3], data.airports[idx][4]];
    }
    const routes = data.routes.map(airline => {
      return [getAirportCoord(airline[1]), getAirportCoord(airline[2])];
    });

    chart.value.setOption({
      textStyle: {
        fontFamily: 'Inter, "Helvetica Neue", Arial, sans-serif'
      },
      title: {
        text: "World Flights",
        top: "5%",
        left: "center",
        textStyle: {
          color: "#eee"
        }
      },
      backgroundColor: "#003",
      tooltip: {
        formatter(param) {
          const route = data.routes[param.dataIndex];
          return (
            data.airports[route[1]][1] + " > " + data.airports[route[2]][1]
          );
        }
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
          color: "#005"
        }
      },
      series: [
        {
          type: "lines",
          coordinateSystem: "geo",
          data: routes,
          large: true,
          largeThreshold: 100,
          lineStyle: {
            opacity: 0.05,
            width: 0.5,
            curveness: 0.3
          },
          blendMode: "lighter"
        }
      ]
    });
  });
}
</script>

<template>
  <v-example id="manual" title="Manual updates">
    <v-chart
      ref="chart"
      autoresize
      :loading="loading"
      :loading-options="loadingOptions"
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
  </v-example>
</template>
