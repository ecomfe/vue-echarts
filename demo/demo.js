import Vue from 'vue'
import ECharts from '../src/components/ECharts.vue'
import Demo from './Demo.vue'
import 'echarts/theme/dark'
import theme from './theme'

Vue.component('chart', ECharts)

// registering custom theme
ECharts.registerTheme('vue-echarts', theme)

new Vue({
    el: '#app',
    components: {
        demo: Demo
    }
})
