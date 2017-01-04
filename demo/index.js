import Vue from 'vue'
import ECharts from '../src/components/ECharts.vue'
import Demo from './Demo.vue'

// built-in theme
import 'echarts/theme/dark'

import chinaMap from './china.json'

// custom theme
import theme from './theme.json'

Vue.component('chart', ECharts)

// registering map data
ECharts.registerMap('china', chinaMap)

// registering custom theme
ECharts.registerTheme('vue-echarts', theme)

new Vue({
  el: '#demo',
  components: {
    demo: Demo
  },
  render: h => h(Demo)
})
