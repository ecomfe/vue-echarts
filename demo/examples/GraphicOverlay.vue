<script setup lang="ts">
import { computed, onUnmounted, shallowRef, watch } from "vue";
import type { ComponentExposed } from "vue-component-type-helpers";
import { usePreferredReducedMotion } from "@vueuse/core";
import { use } from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent, GraphicComponent, TooltipComponent } from "echarts/components";

import VChart from "../../src/ECharts";
import VExample from "./Example.vue";
import { useDemoDark } from "../composables/useDemoDark";
import { GBezierCurve, GCircle, GGroup, GRect, GText } from "../../src/graphic";
import { resolveGraphicOverlayTokens } from "./graphic-overlay/GraphicOverlayTokens";
import { buildGraphicOverlayLayout, OVERLAY_GRID } from "./graphic-overlay/useGraphicOverlayLayout";
import {
  OVERLAY_DAYS,
  OVERLAY_Y_MAX,
  useGraphicOverlayData,
} from "./graphic-overlay/useGraphicOverlayData";
import type { OverlayPlotBounds, OverlayViewport } from "./graphic-overlay/types";
import type { EChartsOption } from "echarts";

use([LineChart, GridComponent, TooltipComponent, GraphicComponent]);

const chartRef = shallowRef<ComponentExposed<typeof VChart>>();
const viewport = shallowRef<OverlayViewport>({
  width: 980,
  height: 360,
});
const nativePlot = shallowRef<OverlayPlotBounds>();

function syncLayout(): void {
  const chart = chartRef.value?.chart;
  if (!chart || chart.isDisposed()) {
    return;
  }
  const topLeft = chart.convertToPixel({ seriesIndex: 0 }, [0, OVERLAY_Y_MAX]);
  const bottomRight = chart.convertToPixel({ seriesIndex: 0 }, [OVERLAY_DAYS.length - 1, 0]);
  if (!topLeft || !bottomRight) {
    return;
  }
  const [left, top] = topLeft;
  const [right, bottom] = bottomRight;
  const width = chart.getWidth();
  const height = chart.getHeight();
  if (viewport.value.width !== width || viewport.value.height !== height) {
    viewport.value = { width, height };
  }
  const current = nativePlot.value;
  // Graphic commits also emit updated; stable bounds must not schedule another commit.
  if (
    !current ||
    current.left !== left ||
    current.right !== right ||
    current.top !== top ||
    current.bottom !== bottom
  ) {
    nativePlot.value = { left, right, top, bottom };
  }
}

const { values, markers, focusedMarkerId, randomizeTrend, rotateFocus, focusMarker, toggleMarker } =
  useGraphicOverlayData();
const CHART_UPDATE_ANIMATION_MS = 300;
const CHART_UPDATE_ANIMATION_EASING = "cubicOut";
const reducedMotion = usePreferredReducedMotion();
const animationDuration = computed(() =>
  reducedMotion.value === "reduce" ? 0 : CHART_UPDATE_ANIMATION_MS,
);
const overlayValues = shallowRef<number[]>([...values.value]);
let overlayRaf = 0;

function easeOutCubic(t: number): number {
  return 1 - (1 - t) * (1 - t) * (1 - t);
}

function stopOverlayAnimation(): void {
  if (!overlayRaf) {
    return;
  }
  cancelAnimationFrame(overlayRaf);
  overlayRaf = 0;
}

watch([() => values.value, animationDuration], ([nextValues, duration]) => {
  const to = [...nextValues];
  const from = [...overlayValues.value];
  stopOverlayAnimation();

  if (from.length === to.length && from.every((value, index) => value === to[index])) {
    return;
  }

  if (typeof requestAnimationFrame === "undefined" || from.length !== to.length || duration === 0) {
    overlayValues.value = to;
    return;
  }

  let startedAt = 0;
  const tick = (now: number) => {
    if (!startedAt) {
      startedAt = now;
    }
    const elapsed = now - startedAt;
    const progress = Math.min(elapsed / duration, 1);
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
});

onUnmounted(stopOverlayAnimation);

const option = computed(
  () =>
    ({
      animationDurationUpdate: animationDuration.value,
      animationEasingUpdate: CHART_UPDATE_ANIMATION_EASING,
      grid: {
        left: `${OVERLAY_GRID.left}%`,
        right: `${OVERLAY_GRID.right}%`,
        top: `${OVERLAY_GRID.top}%`,
        bottom: `${OVERLAY_GRID.bottom}%`,
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
          animationDurationUpdate: animationDuration.value,
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

const overlayMarkers = computed(() =>
  buildGraphicOverlayLayout({
    days: OVERLAY_DAYS,
    values: overlayValues.value,
    markers: markers.value,
    focusedMarkerId: focusedMarkerId.value,
    yMax: OVERLAY_Y_MAX,
    viewport: viewport.value,
    plot: nativePlot.value,
  }),
);

const isDark = useDemoDark();
const ui = computed(() => resolveGraphicOverlayTokens(isDark.value));
</script>

<template>
  <VExample id="graphic" title="Graphic overlay" desc="graphic · markers">
    <VChart ref="chartRef" :option="option" autoresize @updated="syncLayout">
      <template #graphic>
        <GGroup id="overlay-root">
          <template v-for="marker in overlayMarkers" :key="marker.id">
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
