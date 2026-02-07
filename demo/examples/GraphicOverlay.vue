<script setup lang="ts">
import { computed, shallowRef } from "vue";
import { use } from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent, GraphicComponent, TooltipComponent } from "echarts/components";
import VChart from "../../src/ECharts";
import VExample from "./Example.vue";
import { useDemoDark } from "../composables/useDemoDark";
import { GCircle, GGroup, GLine, GRect, GText } from "../../src/graphic";

use([LineChart, GridComponent, TooltipComponent, GraphicComponent]);

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const Y_MAX = 220;
const CHART_WIDTH = 980;
const CHART_HEIGHT = 360;

const GRID = {
  left: 9,
  right: 6,
  top: 30,
  bottom: 14,
};

const SUMMARY_MARGIN = 20;
const SUMMARY = {
  width: 236,
  height: 136,
  x: CHART_WIDTH - 236 - SUMMARY_MARGIN,
  y: SUMMARY_MARGIN,
};

const MARKER_HEIGHT = 28;
const SUMMARY_LAYOUT = {
  insetX: 16,
  titleY: 24,
  firstRowY: 48,
  rowGap: 20,
};

type EventMarker = {
  id: string;
  dayIndex: number;
  title: string;
  color: string;
};

type OverlayMarker = EventMarker & {
  day: string;
  value: number;
  focused: boolean;
  label: string;
  x: number;
  y: number;
  bubbleX: number;
  bubbleY: number;
  bubbleWidth: number;
  bubbleHeight: number;
  textX: number;
  textY: number;
  anchorX: number;
  anchorY: number;
};

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const values = shallowRef([120, 200, 150, 80, 70, 110, 130]);
const markers = shallowRef<EventMarker[]>([
  { id: "launch", dayIndex: 1, title: "Launch push", color: "#10b981" },
  { id: "incident", dayIndex: 3, title: "Checkout dip", color: "#ef4444" },
  { id: "recovery", dayIndex: 5, title: "Recovery", color: "#3b82f6" },
]);
const focusedMarkerId = shallowRef(markers.value[0].id);
const isDark = useDemoDark();

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function intersects(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function expandRect(rect: Rect, padding: number): Rect {
  return {
    x: rect.x - padding,
    y: rect.y - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };
}

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
    data: DAYS,
  },
  yAxis: {
    type: "value",
    min: 0,
    max: Y_MAX,
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

const overlayMarkers = computed<OverlayMarker[]>(() => {
  const plotLeft = (CHART_WIDTH * GRID.left) / 100;
  const plotRight = CHART_WIDTH - (CHART_WIDTH * GRID.right) / 100;
  const plotTop = (CHART_HEIGHT * GRID.top) / 100;
  const plotBottom = CHART_HEIGHT - (CHART_HEIGHT * GRID.bottom) / 100;
  const plotWidth = plotRight - plotLeft;
  const plotHeight = plotBottom - plotTop;
  const laneBySide = { left: 0, right: 0 };
  const placedRects: Rect[] = [];
  const reservedRects: Rect[] = [expandRect({ ...SUMMARY }, 8)];
  const maxBubbleY = plotBottom - MARKER_HEIGHT - 4;

  return markers.value.map((marker) => {
    const value = values.value[marker.dayIndex];
    const x = Math.round(plotLeft + (plotWidth * marker.dayIndex) / (DAYS.length - 1));
    const y = Math.round(plotTop + plotHeight * (1 - value / Y_MAX));
    const day = DAYS[marker.dayIndex];
    const focused = marker.id === focusedMarkerId.value;
    const label = `${marker.title} · ${day}`;

    const bubbleHeight = MARKER_HEIGHT;
    const bubbleWidth = Math.max(108, Math.round(label.length * 6.8 + 26));
    const side = x > CHART_WIDTH * 0.62 ? "left" : "right";
    const lane = side === "left" ? laneBySide.left++ : laneBySide.right++;

    const laneOffset = lane * 28;
    const preferredLeftX = x - bubbleWidth - 16;
    const preferredRightX = x + 16;
    const preferredAboveY = y - 38 - laneOffset;
    const preferredBelowY = y + 10 + laneOffset;

    const rawCandidates =
      side === "left"
        ? [
            { x: preferredLeftX, y: preferredAboveY },
            { x: preferredRightX, y: preferredAboveY },
            { x: preferredLeftX, y: preferredBelowY },
            { x: preferredRightX, y: preferredBelowY },
          ]
        : [
            { x: preferredRightX, y: preferredAboveY },
            { x: preferredLeftX, y: preferredAboveY },
            { x: preferredRightX, y: preferredBelowY },
            { x: preferredLeftX, y: preferredBelowY },
          ];

    const candidates = rawCandidates.map((candidate) => {
      const bubbleX = clamp(candidate.x, 8, CHART_WIDTH - bubbleWidth - 8);
      const bubbleY = clamp(candidate.y, 8, maxBubbleY);
      return {
        bubbleX,
        bubbleY,
        rect: { x: bubbleX, y: bubbleY, width: bubbleWidth, height: bubbleHeight } as Rect,
      };
    });

    const picked =
      candidates.find(
        ({ rect }) =>
          !reservedRects.some((reserved) => intersects(rect, reserved)) &&
          !placedRects.some((placed) => intersects(rect, placed)),
      ) ?? candidates[0];

    const bubbleX = picked.bubbleX;
    const bubbleY = picked.bubbleY;
    placedRects.push(picked.rect);

    const anchorX = bubbleX + bubbleWidth / 2 < x ? bubbleX + bubbleWidth : bubbleX;
    const anchorY = clamp(y, bubbleY + 4, bubbleY + bubbleHeight - 4);

    return {
      ...marker,
      day,
      value,
      focused,
      label,
      x,
      y,
      bubbleX,
      bubbleY,
      bubbleWidth,
      bubbleHeight,
      textX: bubbleX + bubbleWidth / 2,
      textY: bubbleY + bubbleHeight / 2 + 1,
      anchorX,
      anchorY,
    };
  });
});

const summary = computed(() => {
  const data = values.value;
  const peakValue = Math.max(...data);
  const lowValue = Math.min(...data);
  const peakIndex = data.indexOf(peakValue);
  const lowIndex = data.indexOf(lowValue);
  const weekDelta = data[data.length - 1] - data[0];
  const focused = overlayMarkers.value.find((marker) => marker.id === focusedMarkerId.value);

  return {
    peak: `${DAYS[peakIndex]} ${peakValue}`,
    low: `${DAYS[lowIndex]} ${lowValue}`,
    delta: `${weekDelta >= 0 ? "+" : ""}${weekDelta}`,
    focus: focused ? `${focused.title} · ${focused.day}` : "None",
  };
});

const ui = computed(() =>
  isDark.value
    ? {
        cardBg: "rgba(8,14,29,.9)",
        cardStroke: "rgba(100,116,139,.42)",
        cardTitle: "#f8fafc",
        cardLabel: "#8ea4c3",
        cardValue: "#e2e8f0",
        cardFocus: "#e2e8f0",
        bubbleBg: "rgba(10,18,36,.9)",
        bubbleStroke: "rgba(100,116,139,.5)",
        bubbleText: "#e2e8f0",
        bubbleTextFocus: "#f8fafc",
        focusLine: "#e2e8f0",
        dotStroke: "#0b1220",
      }
    : {
        cardBg: "rgba(255,255,255,.94)",
        cardStroke: "rgba(148,163,184,.38)",
        cardTitle: "#0f172a",
        cardLabel: "#6f83a2",
        cardValue: "#1e293b",
        cardFocus: "#1e293b",
        bubbleBg: "rgba(255,255,255,.97)",
        bubbleStroke: "rgba(148,163,184,.55)",
        bubbleText: "#334155",
        bubbleTextFocus: "#0f172a",
        focusLine: "#0f172a",
        dotStroke: "#ffffff",
      },
);

function randomizeTrend() {
  values.value = values.value.map((value) => {
    const drift = Math.round((Math.random() - 0.5) * 44);
    return Math.max(40, Math.min(Y_MAX, value + drift));
  });
}

function rotateFocus() {
  const ids = overlayMarkers.value.map((marker) => marker.id);
  if (ids.length === 0) {
    return;
  }
  const current = ids.indexOf(focusedMarkerId.value);
  focusedMarkerId.value = ids[(current + 1) % ids.length];
}

function focusMarker(id: string) {
  focusedMarkerId.value = id;
}

function toggleMarker() {
  const extraMarker: EventMarker = {
    id: "campaign",
    dayIndex: 6,
    title: "Campaign",
    color: "#f59e0b",
  };

  const exists = markers.value.some((marker) => marker.id === extraMarker.id);

  if (exists) {
    markers.value = markers.value.filter((marker) => marker.id !== extraMarker.id);
    if (focusedMarkerId.value === extraMarker.id) {
      focusedMarkerId.value = markers.value[0]?.id ?? "";
    }
    return;
  }

  markers.value = [...markers.value, extraMarker];
}
</script>

<template>
  <VExample id="graphic" title="Graphic overlay" desc="insight card · event markers · click focus">
    <VChart :option="option" autoresize>
      <template #graphic>
        <GGroup id="overlay-root">
          <GRect
            id="summary-card"
            :x="SUMMARY.x"
            :y="SUMMARY.y"
            :width="SUMMARY.width"
            :height="SUMMARY.height"
            :r="9"
            :fill="ui.cardBg"
            :stroke="ui.cardStroke"
            :line-width="0.8"
            :z="40"
          />
          <GText
            id="summary-title"
            :x="SUMMARY.x + SUMMARY_LAYOUT.insetX"
            :y="SUMMARY.y + SUMMARY_LAYOUT.titleY"
            text="Weekly insight"
            font="600 13px 'Avenir Next', sans-serif"
            text-vertical-align="middle"
            :fill="ui.cardTitle"
            :z="50"
          />
          <GText
            id="summary-peak-label"
            :x="SUMMARY.x + SUMMARY_LAYOUT.insetX"
            :y="SUMMARY.y + SUMMARY_LAYOUT.firstRowY"
            text="Peak"
            font="11.5px 'Avenir Next', sans-serif"
            text-vertical-align="middle"
            :fill="ui.cardLabel"
            :z="50"
          />
          <GText
            id="summary-peak-value"
            :x="SUMMARY.x + SUMMARY.width - SUMMARY_LAYOUT.insetX"
            :y="SUMMARY.y + SUMMARY_LAYOUT.firstRowY"
            :text="summary.peak"
            font="600 11.5px 'Avenir Next', sans-serif"
            text-align="right"
            text-vertical-align="middle"
            :fill="ui.cardValue"
            :z="50"
          />
          <GText
            id="summary-low-label"
            :x="SUMMARY.x + SUMMARY_LAYOUT.insetX"
            :y="SUMMARY.y + SUMMARY_LAYOUT.firstRowY + SUMMARY_LAYOUT.rowGap"
            text="Low"
            font="11.5px 'Avenir Next', sans-serif"
            text-vertical-align="middle"
            :fill="ui.cardLabel"
            :z="50"
          />
          <GText
            id="summary-low-value"
            :x="SUMMARY.x + SUMMARY.width - SUMMARY_LAYOUT.insetX"
            :y="SUMMARY.y + SUMMARY_LAYOUT.firstRowY + SUMMARY_LAYOUT.rowGap"
            :text="summary.low"
            font="600 11.5px 'Avenir Next', sans-serif"
            text-align="right"
            text-vertical-align="middle"
            :fill="ui.cardValue"
            :z="50"
          />
          <GText
            id="summary-delta-label"
            :x="SUMMARY.x + SUMMARY_LAYOUT.insetX"
            :y="SUMMARY.y + SUMMARY_LAYOUT.firstRowY + SUMMARY_LAYOUT.rowGap * 2"
            text="Week delta"
            font="11.5px 'Avenir Next', sans-serif"
            text-vertical-align="middle"
            :fill="ui.cardLabel"
            :z="50"
          />
          <GText
            id="summary-delta-value"
            :x="SUMMARY.x + SUMMARY.width - SUMMARY_LAYOUT.insetX"
            :y="SUMMARY.y + SUMMARY_LAYOUT.firstRowY + SUMMARY_LAYOUT.rowGap * 2"
            :text="summary.delta"
            font="600 11.5px 'Avenir Next', sans-serif"
            text-align="right"
            text-vertical-align="middle"
            :fill="ui.cardValue"
            :z="50"
          />
          <GText
            id="summary-focus-label"
            :x="SUMMARY.x + SUMMARY_LAYOUT.insetX"
            :y="SUMMARY.y + SUMMARY_LAYOUT.firstRowY + SUMMARY_LAYOUT.rowGap * 3"
            text="Focus"
            font="11.5px 'Avenir Next', sans-serif"
            text-vertical-align="middle"
            :fill="ui.cardLabel"
            :z="50"
          />
          <GText
            id="summary-focus-value"
            :x="SUMMARY.x + SUMMARY.width - SUMMARY_LAYOUT.insetX"
            :y="SUMMARY.y + SUMMARY_LAYOUT.firstRowY + SUMMARY_LAYOUT.rowGap * 3"
            :text="summary.focus"
            font="500 11.5px 'Avenir Next', sans-serif"
            text-align="right"
            text-vertical-align="middle"
            :fill="ui.cardFocus"
            :z="50"
          />

          <template v-for="marker in overlayMarkers" :key="marker.id">
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
              :r="12"
              :fill="ui.bubbleBg"
              :stroke="marker.focused ? marker.color : ui.bubbleStroke"
              :line-width="marker.focused ? 1.4 : 1"
              :z="40"
              @click="focusMarker(marker.id)"
            />
            <GText
              :id="`marker-label-${marker.id}`"
              :x="marker.textX"
              :y="marker.textY"
              :text="marker.label"
              font="600 11.5px 'Avenir Next', sans-serif"
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
