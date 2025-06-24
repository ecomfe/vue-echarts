import { ref, computed } from "vue";
import { defineStore } from "pinia";

export const useScoreStore = defineStore("store", () => {
  const scores = ref([
    { name: "Attack", max: 20, value: 19 },
    { name: "Defense", max: 20, value: 9 },
    { name: "Speed", max: 20, value: 18 },
    { name: "Strength", max: 20, value: 16 },
    { name: "Endurance", max: 20, value: 16 },
    { name: "Agility", max: 20, value: 20 },
  ]);

  const metrics = computed(() => {
    return scores.value.map(({ name }) => name);
  });

  function getRadarData(activeIndex: number) {
    return {
      title: {
        text: "Player Ability",
        top: "5%",
        left: "5%",
      },
      textStyle: {
        fontFamily: 'Inter, "Helvetica Neue", Arial, sans-serif',
        fontWeight: 300,
      },
      radar: {
        splitNumber: 4,
        indicator: scores.value.map(({ name, max }, index) => {
          if (index === activeIndex) {
            return { name, max, color: "goldenrod" };
          }
          return { name, max };
        }),
      },
      series: [
        {
          name: "Value",
          type: "radar",
          data: [{ value: scores.value.map(({ value }) => value) }],
        },
      ],
    };
  }

  function increase(index: number, amount: number) {
    const metric = scores.value[index];
    metric.value = Math.max(Math.min(metric.value + amount, metric.max), 0);
  }

  function isMax(index: number) {
    const { value, max } = scores.value[index];
    return value === max;
  }

  function isMin(index: number) {
    return scores.value[index].value === 0;
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
