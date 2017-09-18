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
import echarts from 'echarts/lib/echarts'
import debounce from 'lodash.debounce'
import Vue from 'vue'

// enumerating ECharts events for now
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
  'focusnodeadjacency',
  'unfocusnodeadjacency',
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
  props: {
    options: Object,
    theme: [String, Object],
    initOptions: Object,
    group: String,
    autoResize: Boolean
  },
  data () {
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
      get () {
        return this._delegateGet('width', 'getWidth')
      }
    },
    height: {
      cache: false,
      get () {
        return this._delegateGet('height', 'getHeight')
      }
    },
    isDisposed: {
      cache: false,
      get () {
        return !!this._delegateGet('isDisposed', 'isDisposed')
      }
    },
    computedOptions: {
      cache: false,
      get () {
        return this._delegateGet('computedOptions', 'getOption')
      }
    }
  },
  watch: {
    // use assign statements to tigger "options" and "group" setters
    options: {
      handler (options) {
        if (!this.chart && options) {
          this.init()
        } else {
          this.chart.setOption(this.options, true)
        }
      },
      deep: true
    },
    group (group) {
      this.chart.group = group
    },
    theme () {
      this._destroy()
      this.init()
    }
  },
  methods: {
    // provide a explicit merge option method
    mergeOptions (options) {
      this._delegateMethod('setOption', options)
    },
    // just delegates ECharts methods to Vue component
    // use explicit params to reduce transpiled size for now
    resize (options) {
      this._delegateMethod('resize', options)
    },
    dispatchAction (payload) {
      this._delegateMethod('dispatchAction', payload)
    },
    convertToPixel (finder, value) {
      return this._delegateMethod('convertToPixel', finder, value)
    },
    convertFromPixel (finder, value) {
      return this._delegateMethod('convertFromPixel', finder, value)
    },
    containPixel (finder, value) {
      return this._delegateMethod('containPixel', finder, value)
    },
    showLoading (type, options) {
      this._delegateMethod('showLoading', type, options)
    },
    hideLoading () {
      this._delegateMethod('hideLoading')
    },
    getDataURL (options) {
      return this._delegateMethod('getDataURL', options)
    },
    getConnectedDataURL (options) {
      return this._delegateMethod('getConnectedDataURL', options)
    },
    clear () {
      this._delegateMethod('clear')
    },
    dispose () {
      this._delegateMethod('dispose')
    },
    _delegateMethod (name, ...args) {
      if (!this.chart) {
        Vue.util.warn(`Cannot call [${name}] before the chart is initialized. Set prop [options] first.`, this)
        return
      }
      return this.chart[name](...args)
    },
    _delegateGet (name, method) {
      if (!this.chart) {
        Vue.util.warn(`Cannot get [${name}] before the chart is initialized. Set prop [options] first.`, this)
      }
      return this.chart[method]()
    },
    init () {
      if (this.chart) {
        return
      }

      let chart = echarts.init(this.$el, this.theme, this.initOptions)

      if (this.group) {
        chart.group = this.group
      }

      chart.setOption(this.options, true)

      // expose ECharts events as custom events
      ACTION_EVENTS.forEach(event => {
        chart.on(event, params => {
          this.$emit(event, params)
        })
      })
      MOUSE_EVENTS.forEach(event => {
        chart.on(event, params => {
          this.$emit(event, params)

          // for backward compatibility, may remove in the future
          this.$emit('chart' + event, params)
        })
      })

      if (this.autoResize) {
        this.__resizeHanlder = debounce(() => {
          chart.resize()
        }, 100, { leading: true })
        window.addEventListener('resize', this.__resizeHanlder)
      }

      this.chart = chart
    },
    _destroy () {
      if (this.autoResize) {
        window.removeEventListener('resize', this.__resizeHanlder)
      }
      this.dispose()
      this.chart = null
    }
  },
  mounted () {
    // auto init if `options` is already provided
    if (this.options) {
      this.init()
    }
  },
  activated () {
    if (this.autoResize) {
      this.chart && this.chart.resize()
    }
  },
  beforeDestroy () {
    if (!this.chart) {
      return
    }
    this._destroy()
  },
  connect (group) {
    if (typeof group !== 'string') {
      group = group.map(chart => chart.chart)
    }
    echarts.connect(group)
  },
  disconnect (group) {
    echarts.disConnect(group)
  },
  registerMap (...args) {
    echarts.registerMap(...args)
  },
  registerTheme (...args) {
    echarts.registerTheme(...args)
  }
}
</script>
