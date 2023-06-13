import { defineStore } from "pinia";

export const useScoreStore = defineStore("score", {
  state: () => {
    return {
      scores: [
        { name: "Attack", max: 20, value: 19 },
        { name: "Defense", max: 20, value: 9 },
        { name: "Speed", max: 20, value: 18 },
        { name: "Strength", max: 20, value: 16 },
        { name: "Endurance", max: 20, value: 16 },
        { name: "Agility", max: 20, value: 20 }
      ],
      index: 0
    };
  },
  getters: {
    scoreRadar({ scores }) {
      return {
        title: {
          text: "Player Ability"
        },
        tooltip: {},
        radar: {
          indicator: scores.map(({ name, max }) => {
            return { name, max };
          })
        },
        series: [
          {
            name: "Value",
            type: "radar",
            data: [{ value: scores.map(({ value }) => value) }]
          }
        ]
      };
    }
  },
  actions: {
    getRadarData(activeIndex: number) {
      return {
        animation: false,
        title: {
          text: "Player Ability"
        },
        tooltip: {},
        radar: {
          indicator: this.scores.map(({ name, max }, index) => {
            if (index === activeIndex) {
              return { name, max, color: "goldenrod" };
            }
            return { name, max };
          })
        },
        series: [
          {
            name: "Value",
            type: "radar",
            data: [{ value: this.scores.map(({ value }) => value) }]
          }
        ]
      };
    },
    increase(index: number, amount: number) {
      const metric = this.scores[index];
      metric.value = Math.max(Math.min(metric.value + amount, metric.max), 0);
    },
    isMax(index: number) {
      const { value, max } = this.scores[index];
      return value === max;
    },
    isMin(index: number) {
      return this.scores[index].value === 0;
    }
  }
});
