<script setup lang="ts">
import { computed, onUnmounted, shallowRef, watch, watchEffect } from "vue";
import type { ComponentExposed } from "vue-component-type-helpers";
import { use } from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent, GraphicComponent, TooltipComponent } from "echarts/components";

import VChart from "../../src/ECharts";
import VExample from "./Example.vue";
import { useDemoDark } from "../composables/useDemoDark";
import { GBezierCurve, GCircle, GGroup, GRect, GText } from "../../src/graphic";
import { resolveGraphicOverlayTokens } from "./graphic-overlay/GraphicOverlayTokens";
import { buildGraphicOverlayLayout } from "./graphic-overlay/useGraphicOverlayLayout";
import {
  OVERLAY_DAYS,
  OVERLAY_Y_MAX,
  useGraphicOverlayData,
} from "./graphic-overlay/useGraphicOverlayData";
import type { OverlayViewport } from "./graphic-overlay/types";
import type { EChartsOption } from "echarts";

use([LineChart, GridComponent, TooltipComponent, GraphicComponent]);

const GRID = {
  left: 8,
  right: 5,
  top: 18,
  bottom: 12,
};

const chartRef = shallowRef<ComponentExposed<typeof VChart>>();
const viewport = shallowRef<OverlayViewport>({
  width: 980,
  height: 360,
});

watchEffect((onCleanup) => {
  const target = chartRef.value?.root as HTMLElement | undefined;
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

const { values, markers, focusedMarkerId, randomizeTrend, rotateFocus, focusMarker, toggleMarker } =
  useGraphicOverlayData();
const CHART_UPDATE_ANIMATION_MS = 300;
const CHART_UPDATE_ANIMATION_EASING = "cubicOut";
const overlayValues = shallowRef<number[]>([...values.value]);
let overlayRaf = 0;

function easeOutCubic(t: number): number {
  return 1 - (1 - t) * (1 - t) * (1 - t);
}

watch(
  () => values.value,
  (nextValues) => {
    const to = [...nextValues];
    const from = [...overlayValues.value];

    if (
      typeof requestAnimationFrame === "undefined" ||
      from.length !== to.length ||
      CHART_UPDATE_ANIMATION_MS <= 0
    ) {
      overlayValues.value = to;
      return;
    }

    if (overlayRaf) {
      cancelAnimationFrame(overlayRaf);
      overlayRaf = 0;
    }

    let startedAt = 0;
    const tick = (now: number) => {
      if (!startedAt) {
        startedAt = now;
      }
      const elapsed = now - startedAt;
      const progress = Math.min(elapsed / CHART_UPDATE_ANIMATION_MS, 1);
      const eased = easeOutCubic(progress);

      overlayValues.value = to.map((target, index) =>
        Math.round(from[index] + (target - from[index]) * eased),
      );

      if (progress < 1) {
        overlayRaf = requestAnimationFrame(tick);
        return;
      }
      overlayRaf = 0;
      overlayValues.value = to;
    };

    overlayRaf = requestAnimationFrame(tick);
  },
  { immediate: true },
);

onUnmounted(() => {
  if (overlayRaf) {
    cancelAnimationFrame(overlayRaf);
    overlayRaf = 0;
  }
});

const option = computed(
  () =>
    ({
      animationDurationUpdate: CHART_UPDATE_ANIMATION_MS,
      animationEasingUpdate: CHART_UPDATE_ANIMATION_EASING,
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
          animationDurationUpdate: CHART_UPDATE_ANIMATION_MS,
          animationEasingUpdate: CHART_UPDATE_ANIMATION_EASING,
          smooth: true,
          symbol: "circle",
          symbolSize: 6,
          lineStyle: { width: 3 },
          data: values.value,
        },
      ],
    }) as const satisfies EChartsOption,
);

const layout = computed(() =>
  buildGraphicOverlayLayout({
    days: OVERLAY_DAYS,
    values: overlayValues.value,
    markers: markers.value,
    focusedMarkerId: focusedMarkerId.value,
    yMax: OVERLAY_Y_MAX,
    viewport: viewport.value,
  }),
);

const isDark = useDemoDark();
const ui = computed(() => resolveGraphicOverlayTokens(isDark.value));
</script>

<template>
  <VExample id="graphic" title="Graphic overlay" desc="graphic · markers">
    <VChart ref="chartRef" :option="option" autoresize>
      <template #graphic>
        <GGroup id="overlay-root">
          <template v-for="marker in layout.markers" :key="marker.id">
            <GBezierCurve
              :id="`marker-curve-${marker.id}`"
              :x1="marker.x"
              :y1="marker.y"
              :x2="marker.anchorX"
              :y2="marker.anchorY"
              :cpx1="marker.cpx1"
              :cpy1="marker.cpy1"
              :cpx2="marker.cpx2"
              :cpy2="marker.cpy2"
              :stroke="marker.focused ? ui.focusLine : ui.lineSoft"
              :line-width="marker.focused ? 1.6 : 1.1"
              line-cap="round"
              :z="20"
            />
            <GRect
              :id="`marker-bubble-${marker.id}`"
              :x="marker.bubbleX"
              :y="marker.bubbleY"
              :width="marker.bubbleWidth"
              :height="marker.bubbleHeight"
              :r="10"
              :fill="ui.bubbleBg"
              :stroke="marker.focused ? marker.color : ui.bubbleStroke"
              :line-width="marker.focused ? 1.25 : 1"
              :z="40"
              cursor="pointer"
              @click="focusMarker(marker.id)"
            />
            <GText
              :id="`marker-label-${marker.id}`"
              :x="marker.textX"
              :y="marker.textY"
              :text="marker.label"
              font="600 10px Manrope, sans-serif"
              text-align="center"
              text-vertical-align="middle"
              :fill="marker.focused ? ui.bubbleTextFocus : ui.bubbleText"
              :z="50"
              cursor="pointer"
              @click="focusMarker(marker.id)"
            />
            <GCircle
              :id="`marker-dot-${marker.id}`"
              :cx="marker.x"
              :cy="marker.y"
              :r="marker.focused ? 7 : 5.5"
              :fill="marker.color"
              :stroke="ui.dotStroke"
              :line-width="2"
              :z="60"
              cursor="pointer"
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
