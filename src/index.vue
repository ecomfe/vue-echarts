<template lang="html">
    <core v-bind="$attrs" :echarts="echarts" />
</template>

<script>
import echarts from 'echarts'
import Core from './components/ECharts.vue'
export default {
  data() {
    return {
      echarts
    };
  },
  components: {
    Core
  }
}
</script>
