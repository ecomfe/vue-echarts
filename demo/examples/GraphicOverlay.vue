<script setup lang="ts">
import { computed, shallowRef, watchEffect } from "vue";
import type { ComponentExposed } from "vue-component-type-helpers";
import { use } from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent, GraphicComponent, TooltipComponent } from "echarts/components";

import VChart from "../../src/ECharts";
import VExample from "./Example.vue";
import { useDemoDark } from "../composables/useDemoDark";
import { GCircle, GGroup, GLine, GRect, GText } from "../../src/graphic";
import { resolveGraphicOverlayTokens } from "./graphic-overlay/GraphicOverlayTokens";
import { buildGraphicOverlayLayout } from "./graphic-overlay/useGraphicOverlayLayout";
import {
  OVERLAY_DAYS,
  OVERLAY_Y_MAX,
  useGraphicOverlayData,
} from "./graphic-overlay/useGraphicOverlayData";
import type { OverlayViewport } from "./graphic-overlay/types";

use([LineChart, GridComponent, TooltipComponent, GraphicComponent]);

const GRID = {
  left: 9,
  right: 6,
  top: 30,
  bottom: 14,
};

const chartRef = shallowRef<ComponentExposed<typeof VChart>>();
const viewport = shallowRef<OverlayViewport>({
  width: 980,
  height: 360,
});

watchEffect((onCleanup) => {
  const target = chartRef.value?.root?.value as HTMLElement | undefined;
  if (!target || typeof ResizeObserver === "undefined") {
    return;
  }

  const updateViewport = () => {
    const width = target.clientWidth;
    const height = target.clientHeight;
    if (!width || !height) {
      return;
    }
    viewport.value = { width, height };
  };

  updateViewport();
  const observer = new ResizeObserver(updateViewport);
  observer.observe(target);

  onCleanup(() => {
    observer.disconnect();
  });
});

const {
  values,
  markers,
  focusedMarkerId,
  summary,
  randomizeTrend,
  rotateFocus,
  focusMarker,
  toggleMarker,
} = useGraphicOverlayData();

const option = computed(() => ({
  grid: {
    left: `${GRID.left}%`,
    right: `${GRID.right}%`,
    top: `${GRID.top}%`,
    bottom: `${GRID.bottom}%`,
  },
  tooltip: { trigger: "axis" },
  xAxis: {
    type: "category",
    boundaryGap: false,
    data: OVERLAY_DAYS,
  },
  yAxis: {
    type: "value",
    min: 0,
    max: OVERLAY_Y_MAX,
    splitLine: {
      lineStyle: {
        opacity: 0.22,
      },
    },
  },
  series: [
    {
      type: "line",
      smooth: true,
      symbol: "circle",
      symbolSize: 6,
      lineStyle: { width: 3 },
      data: values.value,
    },
  ],
}));

const layout = computed(() =>
  buildGraphicOverlayLayout({
    days: OVERLAY_DAYS,
    values: values.value,
    markers: markers.value,
    focusedMarkerId: focusedMarkerId.value,
    yMax: OVERLAY_Y_MAX,
    viewport: viewport.value,
  }),
);

const summaryRows = computed(() => [
  { key: "peak", label: "Peak", value: summary.value.peak },
  { key: "low", label: "Low", value: summary.value.low },
  { key: "delta", label: "Week delta", value: summary.value.delta },
  { key: "focus", label: "Focus", value: summary.value.focus },
]);

const isDark = useDemoDark();
const ui = computed(() => resolveGraphicOverlayTokens(isDark.value));

function summaryRowY(index: number): number {
  const panel = layout.value.summary;
  return panel.firstRowY + panel.rowGap * index;
}
</script>

<template>
  <VExample id="graphic" title="Graphic overlay" desc="insight card · event markers · click focus">
    <VChart ref="chartRef" :option="option" autoresize>
      <template #graphic>
        <GGroup id="overlay-root">
          <GRect
            id="summary-card"
            :x="layout.summary.x"
            :y="layout.summary.y"
            :width="layout.summary.width"
            :height="layout.summary.height"
            :r="10"
            :fill="ui.cardBg"
            :stroke="ui.cardStroke"
            :line-width="1"
            :z="40"
          />

          <GText
            id="summary-title"
            :x="layout.summary.x + layout.summary.paddingX"
            :y="layout.summary.titleY"
            text="Weekly insight"
            font="700 15px Manrope, sans-serif"
            text-vertical-align="middle"
            :fill="ui.cardTitle"
            :z="50"
          />

          <template v-for="(row, index) in summaryRows" :key="row.key">
            <GText
              :id="`summary-label-${row.key}`"
              :x="layout.summary.x + layout.summary.paddingX"
              :y="summaryRowY(index)"
              :text="row.label"
              font="500 10.5px Manrope, sans-serif"
              text-vertical-align="middle"
              :fill="ui.cardLabel"
              :z="50"
            />
            <GText
              :id="`summary-value-${row.key}`"
              :x="layout.summary.x + layout.summary.width - layout.summary.paddingX"
              :y="summaryRowY(index)"
              :text="row.value"
              font="700 10.5px Manrope, sans-serif"
              text-align="right"
              text-vertical-align="middle"
              :fill="row.key === 'focus' ? ui.cardFocus : ui.cardValue"
              :z="50"
            />
          </template>

          <template v-for="marker in layout.markers" :key="marker.id">
            <GLine
              :id="`marker-line-${marker.id}`"
              :x1="marker.x"
              :y1="marker.y"
              :x2="marker.anchorX"
              :y2="marker.anchorY"
              :stroke="marker.focused ? ui.focusLine : marker.color"
              :line-width="marker.focused ? 2 : 1.5"
              :z="20"
            />
            <GRect
              :id="`marker-bubble-${marker.id}`"
              :x="marker.bubbleX"
              :y="marker.bubbleY"
              :width="marker.bubbleWidth"
              :height="marker.bubbleHeight"
              :r="15"
              :fill="ui.bubbleBg"
              :stroke="marker.focused ? marker.color : ui.bubbleStroke"
              :line-width="marker.focused ? 1.5 : 1"
              :z="40"
              @click="focusMarker(marker.id)"
            />
            <GText
              :id="`marker-label-${marker.id}`"
              :x="marker.textX"
              :y="marker.textY"
              :text="marker.label"
              font="600 11px Manrope, sans-serif"
              text-align="center"
              text-vertical-align="middle"
              :fill="marker.focused ? ui.bubbleTextFocus : ui.bubbleText"
              :z="50"
              @click="focusMarker(marker.id)"
            />
            <GCircle
              :id="`marker-dot-${marker.id}`"
              :cx="marker.x"
              :cy="marker.y"
              :r="marker.focused ? 8 : 6"
              :fill="marker.color"
              :stroke="ui.dotStroke"
              :line-width="2"
              :z="60"
              @click="focusMarker(marker.id)"
            />
          </template>
        </GGroup>
      </template>
    </VChart>

    <template #extra>
      <p class="actions">
        <button @click="randomizeTrend">Randomize trend</button>
        <button @click="rotateFocus">Rotate focus</button>
        <button @click="toggleMarker">Add/remove campaign</button>
      </p>
    </template>
  </VExample>
</template>
