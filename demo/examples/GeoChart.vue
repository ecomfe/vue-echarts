<script setup lang="ts">
import { use, registerMap } from "echarts/core";
import { ScatterChart, EffectScatterChart } from "echarts/charts";
import {
  GeoComponent,
  TitleComponent,
  LegendComponent,
  TooltipComponent,
} from "echarts/components";
import { shallowRef } from "vue";
import VChart from "../../src/ECharts";
import VExample from "./Example.vue";
import getData from "../data/map";
import chinaMap from "../data/china.json";
import { isGeoJSONSource } from "../utils/geo";

use([
  ScatterChart,
  EffectScatterChart,
  GeoComponent,
  TitleComponent,
  LegendComponent,
  TooltipComponent,
]);

const chinaGeoJSON = isGeoJSONSource(chinaMap) ? chinaMap : null;

if (chinaGeoJSON) {
  registerMap("china", chinaGeoJSON);
}

type ChartInstance = InstanceType<typeof VChart>;

interface Snapshot {
  src: string;
  width: number;
  height: number;
}

const option = shallowRef(getData());
const map = shallowRef<ChartInstance | null>(null);
const preview = shallowRef<HTMLDialogElement | null>(null);
const snapshot = shallowRef<Snapshot | null>(null);

function convert(): void {
  const chart = map.value;
  if (!chart) {
    return;
  }
  snapshot.value = {
    src: chart.getDataURL({ pixelRatio: window.devicePixelRatio || 1 }),
    width: chart.getWidth(),
    height: chart.getHeight(),
  };
  preview.value?.showModal();
}

function closePreview(): void {
  preview.value?.close();
}
</script>

<template>
  <VExample id="map" title="Map" desc="GeoJSON · image converter">
    <VChart ref="map" :option="option" autoresize style="background-color: #404a59" />
    <template #extra>
      <p class="actions">
        <button type="button" @click="convert">Convert to image</button>
      </p>
      <dialog
        ref="preview"
        class="image-preview"
        aria-label="Map image preview"
        @click.self="closePreview"
      >
        <button
          class="preview-close"
          type="button"
          aria-label="Close image preview"
          @click="closePreview"
        >
          <span aria-hidden="true">×</span>
        </button>
        <img
          v-if="snapshot"
          :src="snapshot.src"
          :width="snapshot.width"
          :height="snapshot.height"
          alt="Rendered map chart"
        />
      </dialog>
    </template>
  </VExample>
</template>

<style scoped>
.image-preview {
  padding: 0;
  overflow: visible;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-s);
  box-shadow: var(--shadow);
}

.image-preview::backdrop {
  background: rgba(2, 6, 23, 0.35);
}

.preview-close {
  position: absolute;
  top: 0;
  right: 0;
  transform: translate(50%, -50%);
  width: 2.25rem;
  padding: 0;
  font-size: 1.25rem;
}

.image-preview img {
  display: block;
  width: auto;
  height: auto;
  max-width: 80vw;
  max-height: 80vh;
  border-radius: inherit;
}
</style>
