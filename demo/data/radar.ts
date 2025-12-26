import { ref, computed } from "vue";
import { defineStore } from "pinia";
import type { Option } from "../../src/types";
import { DEMO_TEXT_STYLE } from "../constants";

interface Score {
  name: string;
  max: number;
  value: number;
}

export const useScoreStore = defineStore("store", () => {
  const scores = ref<Score[]>([
    { name: "Attack", max: 20, value: 19 },
    { name: "Defense", max: 20, value: 9 },
    { name: "Speed", max: 20, value: 18 },
    { name: "Strength", max: 20, value: 16 },
    { name: "Endurance", max: 20, value: 16 },
    { name: "Agility", max: 20, value: 20 },
  ]);

  const metrics = computed(() => scores.value.map(({ name }) => name));

  function getRadarData(activeIndex: number): Option {
    const option = {
      title: {
        text: "Player Ability",
        top: "5%",
        left: "5%",
      },
      textStyle: { ...DEMO_TEXT_STYLE },
      radar: {
        splitNumber: 4,
        indicator: scores.value.map(({ name, max }, index) =>
          index === activeIndex ? { name, max, color: "goldenrod" } : { name, max },
        ),
      },
      series: [
        {
          name: "Value",
          type: "radar",
          data: [{ value: scores.value.map(({ value }) => value) }],
        },
      ],
    } satisfies Option;

    return option;
  }

  function increase(index: number, amount: number): void {
    const metric = scores.value[index];
    if (!metric) {
      return;
    }
    const next = Math.max(Math.min(metric.value + amount, metric.max), 0);
    metric.value = next;
  }

  function isMax(index: number): boolean {
    const metric = scores.value[index];
    return metric ? metric.value === metric.max : false;
  }

  function isMin(index: number): boolean {
    const metric = scores.value[index];
    return metric ? metric.value === 0 : false;
  }

  return {
    scores,
    metrics,
    getRadarData,
    increase,
    isMax,
    isMin,
  };
});
