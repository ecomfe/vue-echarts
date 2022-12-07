<template>
  <main>
    <v-chart
      class="echarts"
      id="logo"
      :option="logo"
      :init-options="initOptions"
      autoresize
    />
    <h1>
      <a href="https://github.com/ecomfe/vue-echarts">Vue-ECharts</a>
    </h1>
    <p class="desc">
      Vue.js component for Apache ECharts. (<a
        href="https://github.com/ecomfe/vue-echarts#readme"
        >docs</a
      >)
    </p>

    <h2 id="bar">
      <a href="#bar">
        Bar chart
        <small>(with async data &amp; custom theme)</small>
      </a>
      <button
        :class="{
          round: true,
          expand: expand.bar
        }"
        @click="expand.bar = !expand.bar"
        aria-label="toggle"
      ></button>
    </h2>
    <section v-if="expand.bar">
      <figure>
        <v-chart
          :option="bar"
          :init-options="initOptions"
          ref="bar"
          theme="ovilia-green"
          autoresize
          :loading="barLoading"
          :loadingOptions="barLoadingOptions"
          @zr:click="handleZrClick"
          @click="handleClick"
        />
      </figure>
      <p v-if="seconds <= 0">
        <small>Loaded.</small>
      </p>
      <p v-else>
        <small>
          Data coming in
          <b>{{ seconds }}</b>
          second{{ seconds > 1 ? "s" : "" }}...
        </small>
      </p>
      <p>
        <button @click="refresh" :disabled="seconds > 0">Refresh</button>
      </p>
    </section>

    <h2 id="pie">
      <a href="#pie">
        Pie chart
        <small>(with action dispatch)</small>
      </a>
      <button
        :class="{
          round: true,
          expand: expand.pie
        }"
        @click="expand.pie = !expand.pie"
        aria-label="toggle"
      ></button>
    </h2>
    <section v-if="expand.pie">
      <figure>
        <v-chart
          :option="pie"
          :init-options="initOptions"
          ref="pie"
          autoresize
        />
      </figure>
    </section>

    <h2 id="polar">
      <a href="#polar">
        Polar plot
        <small>(with built-in theme)</small>
      </a>
      <button
        :class="{
          round: true,
          expand: expand.polar
        }"
        @click="expand.polar = !expand.polar"
        aria-label="toggle"
      ></button>
    </h2>
    <section v-if="expand.polar">
      <figure :style="polarTheme === 'dark' ? 'background-color: #100c2a' : ''">
        <v-chart
          :option="polar"
          :init-options="initOptions"
          :theme="polarTheme"
          autoresize
        />
      </figure>
      <p>
        Theme
        <select v-model="polarTheme">
          <option :value="null">Default</option>
          <option value="dark">Dark</option>
        </select>
      </p>
    </section>

    <h2 id="scatter">
      <a href="#scatter">
        Scatter plot
        <small>(with gradient)</small>
      </a>
      <button
        :class="{
          round: true,
          expand: expand.scatter
        }"
        @click="expand.scatter = !expand.scatter"
        aria-label="toggle"
      ></button>
    </h2>
    <section v-if="expand.scatter">
      <figure>
        <v-chart :option="scatter" :init-options="initOptions" autoresize />
      </figure>
    </section>

    <h2 id="map">
      <a href="#map">
        Map
        <small>(with GeoJSON &amp; image converter)</small>
      </a>
      <button
        :class="{
          round: true,
          expand: expand.map
        }"
        @click="expand.map = !expand.map"
        aria-label="toggle"
      ></button>
    </h2>
    <section v-if="expand.map">
      <figure style="background-color: #404a59">
        <v-chart
          :option="map"
          :init-options="initOptions"
          ref="map"
          autoresize
        />
      </figure>
      <p>
        <button @click="convert">Convert to image</button>
      </p>
    </section>

    <!-- <h2 id="radar">
      <a href="#radar">Radar chart <small>(with Vuex integration)</small></a>
      <button
        :class="{
          round: true,
          expand: expand.radar
        }"
        @click="expand.radar = !expand.radar"
        aria-label="toggle"
      ></button>
    </h2>
    <section v-if="expand.radar">
      <figure>
        <v-chart
        class="echarts" :option="scoreRadar" :init-options="initOptions" autoresize />
      </figure>
      <p>
        <select v-model="metricIndex">
          <option v-for="(metric, index) in metrics" :value="index" :key="index"
            >{{ metric }}
          </option>
        </select>
        <button @click="increase(1)" :disabled="isMax">Increase</button>
        <button @click="increase(-1)" :disabled="isMin">Decrease</button>
        <input id="async" type="checkbox" v-model="asyncCount" />
        <label for="async">Async</label>
      </p>
    </section>-->

    <h2 id="connect">
      <a href="#connect">Connectable charts</a>
      <button
        :class="{
          round: true,
          expand: expand.connect
        }"
        @click="expand.connect = !expand.connect"
        aria-label="toggle"
      ></button>
    </h2>
    <section v-if="expand.connect">
      <figure class="half">
        <v-chart
          :option="c1"
          :init-options="initOptions"
          group="radiance"
          ref="c1"
          autoresize
        />
      </figure>
      <figure class="half">
        <v-chart
          :option="c2"
          :init-options="initOptions"
          group="radiance"
          ref="c2"
          autoresize
        />
      </figure>
      <p>
        <label>
          <input type="checkbox" v-model="connected" />
          Connected
        </label>
      </p>
    </section>

    <h2 id="flight">
      <a href="#flight">Manual updates</a>
      <button
        :class="{
          round: true,
          expand: expand.flight
        }"
        @click="expand.flight = !expand.flight"
        aria-label="toggle"
      ></button>
    </h2>
    <section v-if="expand.flight">
      <p>
        <small>
          You may use
          <code>manual-update</code> prop for performance critical use cases.
        </small>
      </p>
      <p>
        <button :disabled="flightLoaded" @click="loadFlights">Load</button>
      </p>
      <figure style="background-color: #003">
        <v-chart
          ref="flight"
          :init-options="initOptions"
          :option="flight"
          autoresize
          :loading="flightLoading"
          :loading-options="flightLoadingOptions"
        />
      </figure>
    </section>

    <footer>
      <a href="//github.com/Justineo">@Justineo</a>|
      <a href="//github.com/ecomfe/vue-echarts/blob/master/LICENSE"
        >MIT License</a
      >|
      <a href="//github.com/ecomfe/vue-echarts">View on GitHub</a>
    </footer>

    <aside :class="{ modal: true, open }" @click="open = false">
      <img v-if="img.src" :src="img.src" :width="img.width" />
    </aside>

    <aside class="renderer">
      <button
        :class="{
          active: initOptions.renderer === 'canvas'
        }"
        @click="initOptions.renderer = 'canvas'"
      >
        Canvas
      </button>
      <button
        :class="{
          active: initOptions.renderer === 'svg'
        }"
        @click="initOptions.renderer = 'svg'"
      >
        SVG
      </button>
    </aside>
  </main>
</template>

<script>
/* eslint-disable no-console */
import qs from "qs";
import VChart from "../ECharts";

import {
  use,
  registerMap,
  registerTheme,
  connect,
  disconnect
} from "echarts/core";
import {
  BarChart,
  LineChart,
  PieChart,
  MapChart,
  RadarChart,
  ScatterChart,
  EffectScatterChart,
  LinesChart
} from "echarts/charts";
import {
  GridComponent,
  PolarComponent,
  GeoComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  VisualMapComponent,
  DatasetComponent,
  ToolboxComponent,
  DataZoomComponent
} from "echarts/components";
import { CanvasRenderer, SVGRenderer } from "echarts/renderers";
import "echarts-liquidfill";
import logo from "./data/logo";
import getBar from "./data/bar";
import pie from "./data/pie";
import polar from "./data/polar";
import scatter from "./data/scatter";
import map from "./data/map";
import { c1, c2 } from "./data/connect";

// custom theme
import theme from "./theme.json";

// Map of China
import chinaMap from "./china.json";
import worldMap from "./world.json";

use([
  BarChart,
  LineChart,
  PieChart,
  MapChart,
  RadarChart,
  ScatterChart,
  EffectScatterChart,
  LinesChart,
  GridComponent,
  PolarComponent,
  GeoComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  VisualMapComponent,
  DatasetComponent,
  CanvasRenderer,
  SVGRenderer,
  ToolboxComponent,
  DataZoomComponent
]);

// registering map data
registerMap("china", chinaMap);
registerMap("world", worldMap);

// registering custom theme
registerTheme("ovilia-green", theme);

export default {
  name: "vue-echarts-demo",
  components: {
    VChart
  },
  data() {
    const options = qs.parse(location.search, { ignoreQueryPrefix: true });
    return {
      options,
      logo,
      bar: getBar(),
      pie,
      polar,
      scatter,
      map,
      c1,
      c2,
      expand: {
        bar: true,
        pie: true,
        polar: true,
        scatter: true,
        map: true,
        radar: true,
        connect: true,
        flight: true
      },
      initOptions: {
        renderer: options.renderer || "canvas"
      },
      polarTheme: "dark",
      seconds: -1,
      asyncCount: false,
      connected: true,
      metricIndex: 0,
      open: false,
      img: {},
      barLoading: false,
      barLoadingOptions: {
        text: "Loading…",
        color: "#4ea397",
        maskColor: "rgba(255, 255, 255, 0.4)"
      },
      flight: null,
      flightLoaded: false,
      flightLoading: false,
      flightLoadingOptions: {
        text: "",
        color: "#c23531",
        textColor: "rgba(255, 255, 255, 0.5)",
        maskColor: "#003",
        zlevel: 0
      }
    };
  },
  methods: {
    handleClick(...args) {
      console.log("click from echarts", ...args);
    },
    handleZrClick(...args) {
      console.log("click from zrender", ...args);
    },
    refresh() {
      // simulating async data from server
      this.seconds = 3;
      this.barLoading = true;
      const timer = setInterval(() => {
        this.seconds--;
        if (this.seconds === 0) {
          clearTimeout(timer);
          this.barLoading = false;
          this.bar = getBar();
        }
      }, 1000);
    },
    toggleRenderer() {
      if (this.initOptions.renderer === "canvas") {
        this.initOptions.renderer = "svg";
      } else {
        this.initOptions.renderer = "canvas";
      }
    },
    convert() {
      const map = this.$refs.map;
      this.img = {
        src: map.getDataURL({
          pixelRatio: window.devicePixelRatio || 1
        }),
        width: map.getWidth(),
        height: map.getHeight()
      };
      this.open = true;
    },
    loadFlights() {
      this.flightLoaded = true;
      this.flightLoading = true;

      import("./data/flight.json").then(({ default: data }) => {
        this.flightLoading = false;

        function getAirportCoord(idx) {
          return [data.airports[idx][3], data.airports[idx][4]];
        }
        const routes = data.routes.map(airline => {
          return [getAirportCoord(airline[1]), getAirportCoord(airline[2])];
        });

        this.flight = {
          textStyle: {
            fontFamily: 'Inter, "Helvetica Neue", Arial, sans-serif'
          },
          title: {
            text: "World Flights",
            left: "center",
            textStyle: {
              color: "#eee"
            }
          },
          backgroundColor: "#003",
          tooltip: {
            formatter(param) {
              const route = data.routes[param.dataIndex];
              return (
                data.airports[route[1]][1] + " > " + data.airports[route[2]][1]
              );
            }
          },
          geo: {
            map: "world",
            left: 0,
            right: 0,
            silent: true,
            itemStyle: {
              borderColor: "#003",
              color: "#005"
            }
          },
          series: [
            {
              type: "lines",
              coordinateSystem: "geo",
              data: routes,
              large: true,
              largeThreshold: 100,
              lineStyle: {
                opacity: 0.05,
                width: 0.5,
                curveness: 0.3
              },
              blendMode: "lighter"
            }
          ]
        };
      });
    },
    startActions() {
      let dataIndex = -1;
      const pie = this.$refs.pie;

      if (!pie) {
        return;
      }

      const dataLen = pie.option.series[0].data.length;

      this.actionTimer = setInterval(() => {
        pie.dispatchAction({
          type: "downplay",
          seriesIndex: 0,
          dataIndex
        });
        dataIndex = (dataIndex + 1) % dataLen;
        pie.dispatchAction({
          type: "highlight",
          seriesIndex: 0,
          dataIndex
        });
        // 显示 tooltip
        pie.dispatchAction({
          type: "showTip",
          seriesIndex: 0,
          dataIndex
        });
      }, 1000);
    },
    stopActions() {
      clearInterval(this.actionTimer);
    }
  },
  watch: {
    connected: {
      handler(value) {
        if (value) {
          connect("radiance");
        } else {
          disconnect("radiance");
        }
      },
      immediate: true
    },
    "initOptions.renderer"(value) {
      this.options.renderer = value === "svg" ? value : undefined;
      let query = qs.stringify(this.options);
      query = query ? "?" + query : "";
      history.pushState(
        {},
        document.title,
        `${location.origin}${location.pathname}${query}${location.hash}`
      );
    },
    "expand.pie"(value) {
      if (value) {
        this.$nextTick(this.startActions);
      } else {
        this.stopActions();
      }
    }
  },
  mounted() {
    this.startActions();
  },
  beforeUnmount() {
    this.stopActions();
  }
};
</script>

<style lang="postcss">
*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  padding: 3em 0 0;
  font-family: Inter, "Helvetica Neue", Arial, sans-serif;
  font-weight: 300;
  color: #666;
  text-align: center;
}

a {
  color: inherit;
  text-decoration: none;
}

h1 {
  margin-bottom: 1em;
  font-family: Inter, "Helvetica Neue", Arial, sans-serif;
}

h1,
h2 {
  color: #2c3e50;
  font-weight: 400;
}

h2 {
  margin-top: 2em;
  padding-top: 1em;
  font-size: 1.2em;

  button {
    margin-left: 1em;
    vertical-align: middle;
  }
}
.desc {
  margin-bottom: 3em;
  color: #7f8c8d;

  a {
    color: #42b983;
  }
}

h2 small {
  opacity: 0.7;
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
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.125);
  line-height: 1.1;
  color: #2973b7;
}
pre,
code {
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

  a {
    display: inline-block;
    margin: 0 5px;
    padding: 3px 0 6px;
    color: #7f8c8d;
    font-size: 2em;
    text-decoration: none;
  }

  a:hover {
    padding-bottom: 3px;
    border-bottom: 3px solid #42b983;
  }
}
button,
select {
  border: 1px solid #4fc08d;
  border-radius: 2em;
  background-color: #fff;
  color: #42b983;
  cursor: pointer;
  font: inherit;
  padding: 0 0.5em;
  transition: opacity 0.3s;
  transition: all 0.2s;

  &:focus {
    outline: none;
  }

  &:focus-visible {
    box-shadow: 0 0 1px #4fc08d;
  }

  &:active {
    background: rgba(79, 192, 141, 0.2);
  }

  &[disabled] {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.round {
    width: 1.6em;
    height: 1.6em;
    position: relative;

    &::before,
    &::after {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 9px;
      height: 1px;
      background-color: #42b983;
    }

    &::after {
      width: 1px;
      height: 9px;
    }

    &.expand::after {
      display: none;
    }
  }
}

label {
  display: flex;
  align-items: center;
  justify-content: center;
}

p {
  button + button,
  button + select,
  select + button,
  select + select {
    margin-left: 0.5em;
  }
}

button,
label,
select {
  font-size: 0.75em;
  height: 2.4em;
}

figure {
  display: inline-block;
  position: relative;
  margin: 2em auto;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  box-shadow: 0 0 45px rgba(0, 0, 0, 0.2);
  padding: 1.5em 2em;
  min-width: calc(40vw + 4em);

  .echarts {
    width: 100%;
    width: 40vw;
    min-width: 400px;
    height: 300px;
  }
}

#logo {
  display: inline-block;
  width: 128px;
  height: 128px;
  pointer-events: none;
}

.modal {
  display: none;
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background-color: rgba(0, 0, 0, 0.2);
  z-index: 1;

  &.open {
    display: block;
  }

  img {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: #404a59;
    max-width: 80vw;
    border: 2px solid #fff;
    border-radius: 3px;
    box-shadow: 0 0 30px rgba(0, 0, 0, 0.2);
  }
}

@media (min-width: 980px) {
  figure.half {
    padding: 1em 1.5em;
    min-width: calc(240px + 3em);

    .echarts {
      width: 28vw;
      min-width: 240px;
      height: 180px;
    }

    &:not(:last-child) {
      margin-right: 15px;
    }
  }
}

@media (max-width: 980px) {
  p {
    display: flex;
    justify-content: center;

    select {
      text-indent: calc(50% - 1em);
    }

    select,
    label {
      border: 1px solid #4fc08d;
      border-radius: 2em;
      background-color: #fff;
      color: #42b983;
      cursor: pointer;
      transition: opacity 0.3s;
    }

    button,
    input,
    select,
    label {
      flex: 1 0;
      margin: 0 0.5em;
      padding: 0;
      line-height: 2.4em;
      max-width: 40vw;
      border-radius: 2px;
      font-size: 0.8em;
    }

    input[type="checkbox"] {
      display: none;

      &:checked + label {
        background: #42b983;
        color: #fff;
      }
    }
  }
  figure {
    width: 100vw;
    margin: 1em auto;
    padding: 1em 0;
    border: none;
    border-radius: 0;
    box-shadow: none;

    .echarts {
      width: 100%;
      min-width: 0;
      height: 75vw;
    }
  }
}
.renderer {
  position: fixed;
  top: 10px;
  left: 10px;
  font-size: 16px;
  text-align: center;

  button {
    float: left;
    position: relative;
    width: 64px;
    border-radius: 6px;
    border-color: #36485e;
    color: rgba(54, 72, 94, 0.8);
    font-weight: 500;

    &:focus-visible {
      box-shadow: 0 0 1px #36485e;
    }

    &:active {
      background: rgba(54, 72, 94, 0.2);
    }

    &.active {
      z-index: 1;
      background-color: #36485e;
      color: #fff;
    }

    &:first-child {
      border-top-right-radius: 0;
      border-bottom-right-radius: 0;
    }

    &:last-child {
      left: -1px;
      border-top-left-radius: 0;
      border-bottom-left-radius: 0;
    }
  }
}
</style>
