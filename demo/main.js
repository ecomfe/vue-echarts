import './polyfill'
import Vue from 'vue'
import Demo from './Demo.vue'

/* eslint-disable no-new */
new Vue({
  el: '#app',
  components: {
    demo: Demo
  },
  render: h => h(Demo)
})
