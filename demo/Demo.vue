<template>
  <main>
    <chart id="logo" :options="logo" auto-resize></chart>
    <h1><a href="https://github.com/Justineo/vue-echarts">Vue-ECharts</a></h1>
    <p class="desc">ECharts component for Vue.js.</p>

    <h2>Bar chart <small>(with async data &amp; custom theme)</small></h2>
    <figure><chart :options="bar" ref="bar" theme="ovilia-green" auto-resize></chart></figure>
    <template v-if="seconds < 0">
      <p><button @click="load">Load</button></p>
    </template>
    <template v-else>
      <p v-if="seconds"><small>Data coming in <b>{{seconds}}</b> second{{seconds > 1 ? 's' : ''}}...</small></p>
      <p v-else><small>Ready.</small></p>
    </template>

    <h2>Pie chart <small>(with action dispatch)</small></h2>
    <figure><chart :options="pie" ref="pie" auto-resize></chart></figure>

    <h2>Polar plot <small>(with built-in theme)</small></h2>
    <figure style="background-color: #333;"><chart :options="polar" theme="dark" auto-resize></chart></figure>

    <h2>Scatter plot <small>(with gradient)</small></h2>
    <figure><chart id="scatter" :options="scatter" auto-resize></chart></figure>

    <h2>Map <small>(with GeoJSON &amp; image converter)</small></h2>
    <figure style="background-color: #404a59;"><chart id="map" :options="map" ref="map" auto-resize></chart></figure>
    <p><button @click="convert">Convert to image</button></p>

    <h2>Radar chart <small>(with Vuex integration)</small></h2>
    <figure><chart :options="scoreRadar" auto-resize></chart></figure>
    <p>
      <select v-model="metricIndex">
        <option v-for="(metric, index) in metrics" :value="index">{{metric}}</option>
      </select>
      <button @click="increase(1)" :disabled="isMax">Increase</button>
      <button @click="increase(-1)" :disabled="isMin">Decrease</button>
      <input id="async" type="checkbox" v-model="asyncCount"><label for="async"> Async</label>
    </p>

    <h2>Connectable charts</h2>
    <figure class="half"><chart :options="c1" group="radiance" ref="c1" auto-resize></chart></figure>
    <figure class="half"><chart :options="c2" group="radiance" ref="c2" auto-resize></chart></figure>
    <p>
      <input id="connect" type="checkbox" v-model="connected"><label for="connect"> Connected</label>
    </p>

    <footer>
      <a href="//github.com/Justineo">@Justineo</a>|<a href="//github.com/Justineo/vue-echarts/blob/master/LICENSE">MIT License</a>|<a href="//github.com/Justineo/vue-echarts">View on GitHub</a>
    </footer>
  </main>
</template>

<style lang="stylus">
*,
*::before,
*::after
  box-sizing border-box

body
  margin 0
  padding 3em 0 0
  font-family "Source Sans Pro", "Helvetica Neue", Arial, sans-serif
  color #666
  text-align center

a
  color inherit
  text-decoration none

h1
  margin-bottom 1em
  font-family Dosis, "Source Sans Pro", "Helvetica Neue", Arial, sans-serif

h1,
h2
  color #2c3e50
  font-weight 300

h2
  margin-top 3em
  font-size 1.2em

.desc
  margin-bottom 4em
  color #7f8c8d

h2 small
  opacity .7

p small
  font-size .8em
  color #7f8c8d

p
  line-height 1.5

pre
  display inline-block
  padding .8em
  background-color #f9f9f9
  box-shadow 0 1px 2px rgba(0,0,0,.125)
  line-height 1.1
  color #2973b7

pre,
code
  font-family "Roboto Mono", Monaco, courier, monospace

pre code
  font-size .8em

.attr
  color #e96900

.val
  color #42b983

footer
  margin 5em 0 3em
  font-size .5em
  vertical-align middle

  a
    display inline-block
    margin 0 5px
    padding 3px 0 6px
    color #7f8c8d
    font-size 2em
    text-decoration none

  a:hover
    padding-bottom 3px
    border-bottom 3px solid #42b983

button
  border 1px solid #4fc08d
  border-radius 2em
  background-color #fff
  color #42b983
  cursor pointer
  font inherit
  transition opacity .3s

  &:focus
    outline none
    box-shadow 0 0 1px #4fc08d

  &:active
    background rgba(79, 192, 141, .2)

  &[disabled]
    opacity .5
    cursor not-allowed

button,
label
  font-size .75em

figure
  display inline-block
  margin 2em auto
  border 1px solid rgba(0, 0, 0, .1)
  border-radius 8px
  box-shadow 0 0 45px rgba(0, 0, 0, .2)
  padding 1.5em 2em

  .echarts
    width 40vw
    min-width 400px
    height 300px

#logo
  display inline-block
  width 128px
  height 128px
  pointer-events none

@media (min-width 980px)
  figure.half
    padding 1em 1.5em

    .echarts
      width 28vw
      min-width 240px
      height 180px

    &:not(:last-child)
      margin-right 15px

@media (max-width 980px)
  p
    display flex
    justify-content center

    select
      text-indent calc(50% - 1em)

    select,
    label
      border 1px solid #4fc08d
      border-radius 2em
      background-color #fff
      color #42b983
      cursor pointer
      transition opacity .3s

    button,
    input,
    select,
    label
      flex 1 0
      margin 0 .5em
      padding 0
      line-height 2.4em
      max-width 40vw
      border-radius 2px
      font-size .8em

    select
      -webkit-appearance none

    input[type="checkbox"]
      display none

      &:checked + label
        background #42b983
        color #fff

  figure
    width 100vw
    margin 1em auto
    padding 0 1em
    border none
    border-radius 0
    box-shadow none

    .echarts
      width 100%
      min-width 0
      height 75vw
</style>

<script>
import ECharts from '../src/components/ECharts.vue'
import 'echarts-liquidfill'
import logo from './data/logo'
import {initial as barInit, async as barAsync} from './data/bar'
import pie from './data/pie'
import polar from './data/polar'
import scatter from './data/scatter'
import map from './data/map'
import {c1, c2} from './data/connect'
import store from './store'

// built-in theme
import 'echarts/theme/dark'

// custom theme
import theme from './theme.json'

// Map of China
import chinaMap from './china.json'

// registering map data
ECharts.registerMap('china', chinaMap)

// registering custom theme
ECharts.registerTheme('ovilia-green', theme)

export default {
  store,
  data() {
    return {
      logo,
      bar: barInit,
      pie,
      polar,
      scatter,
      map,
      c1,
      c2,
      seconds: -1,
      asyncCount: false,
      connected: true,
      metricIndex: 0
    }
  },
  computed: {
    scoreRadar() {
      return this.$store.getters.scoreRadar
    },
    metrics() {
      return this.$store.state.scores.map(({name}) => name)
    },
    isMax() {
      let {value, max} = this.$store.state.scores[this.metricIndex]
      return value === max
    },
    isMin() {
      return this.$store.state.scores[this.metricIndex].value === 0
    }
  },
  methods: {
    load() {
      // simulating async data from server
      this.seconds = 3
      let bar = this.$refs.bar
      bar.showLoading({
        text: '正在加载',
        color: '#4ea397',
        maskColor: 'rgba(255, 255, 255, 0.4)'
      })
      let timer = setInterval(() => {
        this.seconds--
        if (this.seconds === 0) {
          clearTimeout(timer)
          bar.hideLoading()
          bar.mergeOptions(barAsync)
        }
      }, 1000)
    },
    convert() {
      let map = this.$refs.map
      let src = map.getDataURL({
        pixelRatio: window.devicePixelRatio || 1
      })
      window.open(`data:text/html,<img src="${src}" width="${map.width}" height="${map.height}">`)
    },
    increase(amount) {
      if (!this.asyncCount) {
        this.$store.commit('increment', {amount, index: this.metricIndex})
      } else {
        this.$store.dispatch('asyncIncrement', {amount, index: this.metricIndex, delay: 500})
      }
    }
  },
  watch: {
    connected: {
      handler(value) {
        ECharts[value ? 'connect' : 'disconnect']('radiance')
      }
    }
  },
  mounted() {
    let dataIndex = -1
    let pie = this.$refs.pie
    let dataLen = pie.options.series[0].data.length
    setInterval(() => {
      pie.dispatchAction({
        type: 'downplay',
        seriesIndex: 0,
        dataIndex
      })
      dataIndex = (dataIndex + 1) % dataLen
      pie.dispatchAction({
        type: 'highlight',
        seriesIndex: 0,
        dataIndex
      })
      // 显示 tooltip
      pie.dispatchAction({
        type: 'showTip',
        seriesIndex: 0,
        dataIndex
      })
    }, 1000)
  }
}
</script>
