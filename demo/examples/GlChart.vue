<script setup>
import { use } from "echarts/core";
import { Bar3DChart } from "echarts-gl/charts";
import { VisualMapComponent } from "echarts/components";
import { GlobeComponent } from "echarts-gl/components";
import { shallowRef, onMounted } from "vue";
import VChart from "../../src/ECharts";
import VExample from "./Example.vue";
import world from "../assets/world.jpg";
import starfield from "../assets/starfield.jpg";

use([Bar3DChart, VisualMapComponent, GlobeComponent]);

const option = shallowRef();
const loading = shallowRef(true);

const initOptions = {
  renderer: "canvas",
};

const loadingOptions = {
  text: "Loading...",
  color: "#000",
  textColor: "#fff",
  maskColor: "transparent",
};

onMounted(() => {
  import("../data/population.json").then(({ default: data }) => {
    loading.value = false;

    data = data
      .filter((dataItem) => dataItem[2] > 0)
      .map((dataItem) => [dataItem[0], dataItem[1], Math.sqrt(dataItem[2])]);

    option.value = {
      backgroundColor: "#000",
      globe: {
        baseTexture: world,
        heightTexture: world,
        shading: "lambert",
        environment: starfield,
        light: {
          main: {
            intensity: 2,
          },
        },
        viewControl: {
          autoRotate: false,
        },
      },
      visualMap: {
        bottom: "3%",
        left: "3%",
        max: 40,
        calculable: true,
        realtime: false,
        inRange: {
          colorLightness: [0.2, 0.9],
        },
        textStyle: {
          color: "#fff",
        },
        controller: {
          inRange: {
            color: "orange",
          },
        },
        outOfRange: {
          colorAlpha: 0,
        },
      },
      series: [
        {
          type: "bar3D",
          coordinateSystem: "globe",
          data: data,
          barSize: 0.6,
          minHeight: 0.2,
          silent: true,
          itemStyle: {
            color: "orange",
          },
        },
      ],
    };
  });
});
</script>

<template>
  <v-example id="gl" title="GL charts" desc="(Globe & Bar3D)">
    <v-chart
      :option="option"
      :init-options="initOptions"
      autoresize
      :loading="loading"
      :loading-options="loadingOptions"
      style="background-color: #000"
    />
    <template #extra>
      <p>
        You can use extension packs like
        <a href="https://github.com/ecomfe/echarts-gl">ECharts-GL</a>.
      </p>
      <p>
        <small>(You can only use the canvas renderer for GL charts.)</small>
      </p>
    </template>
  </v-example>
</template>
