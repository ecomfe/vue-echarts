import Vue from 'vue'
import ECharts from '../src/components/ECharts.vue'
import Demo from './Demo.vue'

// registering component
Vue.component('chart', ECharts)

new Vue({
  el: '#demo',
  components: {
    demo: Demo
  },
  render: h => h(Demo)
})
