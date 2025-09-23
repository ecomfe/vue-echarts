<script setup lang="ts">
import { use } from "echarts/core";
import { Bar3DChart } from "echarts-gl/charts";
import { VisualMapComponent } from "echarts/components";
import { GlobeComponent } from "echarts-gl/components";
import { shallowRef, onMounted } from "vue";
import type { InitOptions, LoadingOptions, Option } from "../../src/types";
import VChart from "../../src/ECharts";
import VExample from "./Example.vue";
import world from "../assets/world.jpg";
import starfield from "../assets/starfield.jpg";
import { DEMO_TEXT_STYLE } from "../constants";

use([Bar3DChart, VisualMapComponent, GlobeComponent]);

type GlobeDatum = [number, number, number];

function isGlobeData(value: unknown): value is GlobeDatum[] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        Array.isArray(entry) &&
        entry.length === 3 &&
        typeof entry[0] === "number" &&
        typeof entry[1] === "number" &&
        typeof entry[2] === "number",
    )
  );
}

const option = shallowRef<Option | undefined>(undefined);
const loading = shallowRef(true);

const initOptions: InitOptions = {
  renderer: "canvas",
};

const loadingOptions: LoadingOptions = {
  text: "Loading...",
  color: "#000",
  textColor: "#fff",
  maskColor: "transparent",
};

onMounted(async () => {
  const module = await import("../data/population.json");
  const population = module.default;

  if (!isGlobeData(population)) {
    loading.value = false;
    return;
  }

  const processed = population
    .filter(([, , amount]) => amount > 0)
    .map(([lon, lat, amount]): GlobeDatum => [lon, lat, Math.sqrt(amount)]);

  option.value = {
    textStyle: { ...DEMO_TEXT_STYLE },
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
        data: processed,
        barSize: 0.6,
        minHeight: 0.2,
        silent: true,
        itemStyle: {
          color: "orange",
        },
      },
    ],
  } satisfies Option;

  loading.value = false;
});
</script>

<template>
  <VExample id="gl" title="GL charts" desc="Globe · Bar3D">
    <VChart
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
  </VExample>
</template>
