import Vue from 'vue'
import Demo from './Demo.vue'

Vue.config.productionTip = false

/* eslint-disable no-new */
new Vue({
  render: h => h(Demo)
}).$mount('#app')
