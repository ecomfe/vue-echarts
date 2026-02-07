import { computed, shallowRef } from "vue";

import type { EventMarker, SummaryData } from "./types";

export const OVERLAY_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const OVERLAY_Y_MAX = 220;

export function useGraphicOverlayData() {
  const values = shallowRef([120, 200, 150, 80, 70, 110, 130]);
  const markers = shallowRef<EventMarker[]>([
    { id: "launch", dayIndex: 1, title: "Launch push", color: "#10b981" },
    { id: "incident", dayIndex: 3, title: "Checkout dip", color: "#ef4444" },
    { id: "recovery", dayIndex: 5, title: "Recovery", color: "#3b82f6" },
  ]);
  const focusedMarkerId = shallowRef(markers.value[0].id);

  const summary = computed<SummaryData>(() => {
    const data = values.value;
    const peakValue = Math.max(...data);
    const lowValue = Math.min(...data);
    const peakIndex = data.indexOf(peakValue);
    const lowIndex = data.indexOf(lowValue);
    const weekDelta = data[data.length - 1] - data[0];

    const focused = markers.value.find((marker) => marker.id === focusedMarkerId.value);
    const focus = focused ? `${focused.title} · ${OVERLAY_DAYS[focused.dayIndex]}` : "None";

    return {
      peak: `${OVERLAY_DAYS[peakIndex]} ${peakValue}`,
      low: `${OVERLAY_DAYS[lowIndex]} ${lowValue}`,
      delta: `${weekDelta >= 0 ? "+" : ""}${weekDelta}`,
      focus,
    };
  });

  function randomizeTrend() {
    values.value = values.value.map((value) => {
      const drift = Math.round((Math.random() - 0.5) * 40);
      return Math.max(40, Math.min(OVERLAY_Y_MAX, value + drift));
    });
  }

  function rotateFocus() {
    const ids = markers.value.map((marker) => marker.id);
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

  return {
    values,
    markers,
    focusedMarkerId,
    summary,
    randomizeTrend,
    rotateFocus,
    focusMarker,
    toggleMarker,
  };
}
