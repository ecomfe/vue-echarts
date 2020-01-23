import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    scores: [
      { name: '进攻', max: 20, value: 19 },
      { name: '防守', max: 20, value: 9 },
      { name: '速度', max: 20, value: 18 },
      { name: '力量', max: 20, value: 16 },
      { name: '耐力', max: 20, value: 16 },
      { name: '敏捷', max: 20, value: 20 }
    ]
  },
  getters: {
    scoreRadar ({ scores }) {
      return {
        title: {
          text: '能力雷达图'
        },
        tooltip: {},
        radar: {
          indicator: scores.map(({ name, max }) => {
            return { name, max }
          })
        },
        series: [
          {
            name: '能力值',
            type: 'radar',
            data: [{ value: scores.map(({ value }) => value) }]
          }
        ]
      }
    }
  },
  mutations: {
    increment ({ scores }, { amount = 1, index = 0 }) {
      const metric = scores[index]
      metric.value = Math.max(Math.min(metric.value + amount, metric.max), 0)
    }
  },
  actions: {
    asyncIncrement ({ commit }, { amount = 1, index, delay }) {
      setTimeout(() => {
        commit('increment', { amount, index })
      }, delay)
    }
  }
})
