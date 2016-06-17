var Vue = require('vue')
var Demo = require('./Demo.vue')
var ECharts = require('../src/components/ECharts.vue')

Vue.component('chart', ECharts);

new Vue({
  el: 'body',
  components: {
    demo: Demo
  }
})
