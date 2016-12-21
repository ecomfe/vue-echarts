import Vue from 'vue'
import ECharts from '../src/components/ECharts.vue'
import Demo from './Demo.vue'

// built-in theme
import 'echarts/theme/dark'

// custom theme
import theme from './theme'

Vue.component('chart', ECharts)

// registering custom theme
ECharts.registerTheme('vue-echarts', theme)

new Vue({
  el: '#demo',
  components: {
    demo: Demo
  },
  render: h => h(Demo)
})
