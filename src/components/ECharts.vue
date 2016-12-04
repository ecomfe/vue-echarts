<template>
  <div class="echarts"></div>
</template>

<style>
.echarts {
  width: 600px;
  height: 400px;
}
</style>

<script>
import echarts from 'echarts'

// enumerated ECharts events for now
const ACTION_EVENTS = [
  'legendselectchanged',
  'legendselected',
  'legendunselected',
  'datazoom',
  'datarangeselected',
  'timelinechanged',
  'timelineplaychanged',
  'restore',
  'dataviewchanged',
  'magictypechanged',
  'geoselectchanged',
  'geoselected',
  'geounselected',
  'pieselectchanged',
  'pieselected',
  'pieunselected',
  'mapselectchanged',
  'mapselected',
  'mapunselected',
  'axisareaselected',
  'brush',
  'brushselected'
]

const MOUSE_EVENTS = [
  'click',
  'dblclick',
  'mouseover',
  'mouseout',
  'mousedown',
  'mouseup',
  'globalout'
]

export default {
  props: ['options', 'theme', 'initOptions', 'group'],
  data: function () {
    return {
      chart: null
    }
  },
  computed: {
    // Only recalculated when accessed from JavaScript.
    // Won't update DOM on value change because getters
    // don't depend on reactive values
    width: {
      cache: false,
      getter: function () {
        return this.chart.getWidth()
      }
    },
    height: {
      cache: false,
      getter: function () {
        return this.chart.getHeight()
      }
    },
    isDisposed: {
      cache: false,
      getter: function () {
        return this.chart.isDisposed()
      }
    }
  },
  methods: {
    // provide a explicit merge option method
    mergeOptions: function (options) {
      this.chart.setOption(options)
    },
    // just delegates ECharts methods to Vue component
    resize(options) {
      this.chart.resize(options)
    },
    dispatchAction: function (payload) {
      this.chart.dispatchAction(payload)
    },
    convertToPixel(...args) {
      return this.chart.convertToPixel(...args)
    },
    convertFromPixel(...args) {
      return this.chart.convertFromPixel(...args)
    },
    containPixel(...args) {
      return this.chart.containPixel(...args)
    },
    showLoading(...args) {
      this.chart.showLoading(...args)
    },
    hideLoading() {
      this.chart.hideLoading()
    },
    getDataURL(options) {
      return this.chart.getDataURL(options)
    },
    getConnectedDataURL(options) {
      return this.chart.getConnectedDataURL(options)
    },
    clear() {
      this.chart.clear()
    },
    dispose() {
      this.chart.dispose()
    }
  },
  ready: function () {
    let chart = echarts.init(this.$el, this.theme, this.initOptions)

    // use assign statements to tigger "options" and "group" setters
    chart.setOption(this.options)
    this.$watch('options', options => {
      chart.setOption(options, true)
    }, { deep: true })

    chart.group = this.group
    this.$watch('group', (group) => {
      chart.group = group
    })

    // expose ECharts events as custom events
    ACTION_EVENTS.forEach(event => {
      chart.on(event, params => {
        this.$dispatch(event, params)
      })
    })
    // mouse events of ECharts should be renamed to prevent
    // name collision with DOM events
    MOUSE_EVENTS.forEach(event => {
      chart.on(event, params => {
        this.$dispatch('chart' + event, params)
      })
    })

    this.chart = chart
  },
  connect: function (group) {
    if (typeof group !== 'string') {
      group = group.map(chart => chart.chart)
    }
    echarts.connect(group)
  },
  disconnect: function (group) {
    echarts.connect(group)
  },
  registerMap: function (name, geoData, area) {
    echarts.registerMap(name, geoData, area)
  },
  registerTheme: function (name, theme) {
    echarts.registerTheme(name, theme)
  }
}
</script>
