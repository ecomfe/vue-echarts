import { shallowRef } from "vue";

import type { EventMarker } from "./types";

export const OVERLAY_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const OVERLAY_Y_MAX = 220;
const OVERLAY_Y_MIN = 40;
const CAMPAIGN_BOOST = 14;

const CAMPAIGN_MARKER: EventMarker = {
  id: "campaign",
  dayIndex: 6,
  title: "Campaign push",
  color: "#ff9f0a",
};

const INITIAL_VALUES = [114, 182, 146, 92, 74, 112, 128];

function randomInt(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min));
}

function clampValue(value: number): number {
  return Math.max(OVERLAY_Y_MIN, Math.min(OVERLAY_Y_MAX, Math.round(value)));
}

function buildSemanticTrend(campaignEnabled: boolean): number[] {
  const mon = randomInt(96, 124);
  const tue = clampValue(mon + randomInt(46, 78));
  const wed = clampValue(tue - randomInt(24, 42));
  const thu = clampValue(Math.min(wed - randomInt(22, 38), randomInt(80, 98)));
  const fri = clampValue(Math.min(thu - randomInt(6, 18), randomInt(62, 84)));
  const sat = clampValue(fri + randomInt(26, 44));
  const baseSun = clampValue(sat + randomInt(6, 20));
  const sun = campaignEnabled ? clampValue(Math.max(baseSun + CAMPAIGN_BOOST, sat + 16)) : baseSun;

  return [mon, tue, wed, thu, fri, sat, sun];
}

export function useGraphicOverlayData() {
  const values = shallowRef([...INITIAL_VALUES]);
  const markers = shallowRef<EventMarker[]>([
    { id: "launch", dayIndex: 1, title: "Launch spike", color: "#34c759" },
    { id: "incident", dayIndex: 3, title: "Checkout dip", color: "#ff453a" },
    { id: "recovery", dayIndex: 5, title: "Recovery rebound", color: "#0a84ff" },
  ]);
  const focusedMarkerId = shallowRef(markers.value[0].id);

  function randomizeTrend() {
    const campaignEnabled = markers.value.some((marker) => marker.id === CAMPAIGN_MARKER.id);
    values.value = buildSemanticTrend(campaignEnabled);
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
    const exists = markers.value.some((marker) => marker.id === CAMPAIGN_MARKER.id);

    if (exists) {
      markers.value = markers.value.filter((marker) => marker.id !== CAMPAIGN_MARKER.id);
      values.value = values.value.map((value, index, data) => {
        if (index !== CAMPAIGN_MARKER.dayIndex) {
          return value;
        }
        return clampValue(Math.max(data[5] + 4, value - CAMPAIGN_BOOST));
      });
      if (focusedMarkerId.value === CAMPAIGN_MARKER.id) {
        focusedMarkerId.value = markers.value[0]?.id ?? "";
      }
      return;
    }

    markers.value = [...markers.value, CAMPAIGN_MARKER];
    values.value = values.value.map((value, index, data) => {
      if (index !== CAMPAIGN_MARKER.dayIndex) {
        return value;
      }
      return clampValue(Math.max(value + CAMPAIGN_BOOST, data[5] + 16));
    });
  }

  return {
    values,
    markers,
    focusedMarkerId,
    randomizeTrend,
    rotateFocus,
    focusMarker,
    toggleMarker,
  };
}
