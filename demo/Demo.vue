<template>
  <main>
    <figure id="logo" v-html="logo"></figure>
    <h1><a href="https://github.com/Justineo/vue-echarts">Vue-ECharts</a></h1>
    <p class="desc">ECharts component for Vue.js.</p>

    <h2>Bar chart <small>(with async data &amp; custom theme)</small></h2>
    <template v-if="seconds < 0">
      <p><button @click="load">Load</button></p>
    </template>
    <template v-else>
      <p v-if="seconds"><small>Data coming in <b>{{seconds}}</b> second{{seconds > 1 ? 's' : ''}}...</small></p>
      <p v-else><small>Ready.</small></p>
    </template>
    <chart :options="bar" ref="bar" theme="ovilia-green" auto-resize></chart>
    <p><small>(Theme Ovilia-Green)</small></p>

    <h2>Pie chart <small>(with action dispatch)</small></h2>
    <chart :options="pie" ref="pie" auto-resize></chart>

    <h2>Polar plot <small>(with built-in theme)</small></h2>
    <chart :options="polar" theme="dark" auto-resize></chart>

    <h2>Scatter plot <small>(with gradient)</small></h2>
    <chart id="scatter" :options="scatter" auto-resize></chart>

    <h2>Map <small>(with GeoJSON &amp; image converter)</small></h2>
    <chart id="map" :options="map" ref="map" auto-resize></chart>
    <p><button @click="convert">Convert to image</button></p>

    <footer>
      <a href="//github.com/Justineo">@Justineo</a>|<a href="//github.com/Justineo/vue-echarts/blob/master/LICENSE">MIT License</a>|<a href="//github.com/Justineo/vue-echarts">View on GitHub</a>
    </footer>
  </main>
</template>

<style>
body {
  margin: 0;
  padding: 3em 0 0;
  font-family: "Source Sans Pro", "Helvetica Neue", Arial, sans-serif;
  color: #666;
  text-align: center;
}

a {
  color: inherit;
  text-decoration: none;
}

h1 {
  margin-bottom: 1em;
  font-family: Dosis, "Source Sans Pro", "Helvetica Neue", Arial, sans-serif;
}

h1, h2 {
  color: #2c3e50;
  font-weight: 300;
}

h2 {
  margin-top: 3em;
  font-size: 1.2em;
}

.desc {
  margin-bottom: 4em;
  color: #7f8c8d;
}

h2 small {
  opacity: .7;
}

p small {
  font-size: 0.8em;
  color: #7f8c8d;
}

p {
  line-height: 1.5;
}

pre {
  display: inline-block;
  padding: 0.8em;
  background-color: #f9f9f9;
  box-shadow: 0 1px 2px rgba(0,0,0,0.125);
  line-height: 1.1;
  color: #2973b7;
}

pre, code {
  font-family: "Roboto Mono", Monaco, courier, monospace;
}

pre code {
  font-size: 0.8em;
}

.attr {
  color: #e96900;
}

.val {
  color: #42b983;
}

footer {
  margin: 5em 0 3em;
  font-size: 0.5em;
  vertical-align: middle;
}

footer a {
  display: inline-block;
  margin: 0 5px;
  padding: 3px 0 6px;
  color: #7f8c8d;
  font-size: 2em;
  text-decoration: none;
}

footer a:hover {
  padding-bottom: 3px;
  border-bottom: 3px solid #42b983;
}

button {
  box-sizing: border-box;
  border: 1px solid #4fc08d;
  border-radius: 2em;
  background-color: #fff;
  color: #42b983;
  cursor: pointer;
}

body .echarts {
  width: 40vw;
  min-width: 400px;
  height: 300px;
  margin: 2em auto;
  border: 1px solid rgba(0, 0, 0, .1);
  border-radius: 8px;
  box-shadow: 0 0 45px rgba(0, 0, 0, .2);
  padding: 1.5em 2em;
}

#logo svg {
  height: 192px;
  margin: -2.5em auto;
}

#logo path {
  animation: 6s ease-in 0s infinite fill;
}

@keyframes fill {
  0% {
    fill: #42b983;
  }
  50% {
    fill: #2c3e50;
  }
  100% {
    fill: #42b983;
  }
}
</style>

<script>
import ECharts from '../src/components/ECharts.vue'
import bar from './data/bar'
import pie from './data/pie'
import polar from './data/polar'
import scatter from './data/scatter'
import map from './data/map'
import logo from 'raw!./assets/Vue-ECharts.svg'

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
  data() {
    return {
      bar,
      pie,
      polar,
      scatter,
      map,
      seconds: -1,
      logo
    }
  },
  methods: {
    load() {
      let asyncData = {
        categories: ["衬衫","羊毛衫","雪纺衫","裤子","高跟鞋","袜子"],
        data: [5, 20, 36, 10, 10, 20]
      }

      // simulating async data from server
      this.seconds = 3;
      let timer = setInterval(() => {
        this.seconds--;
        if (this.seconds === 0) {
          clearTimeout(timer);
          this.$refs.bar.mergeOptions({
            xAxis: {
              data: asyncData.categories
            },
            series: [{
              name: '销量',
              data: asyncData.data
            }]
          })
        }
      }, 1000)
    },
    convert() {
      window.open(this.$refs.map.getDataURL())
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
