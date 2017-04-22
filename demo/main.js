import Vue from 'vue'
import Demo from './Demo.vue'

new Vue({
  el: '#app',
  components: {
    demo: Demo
  },
  render: h => h(Demo)
})
