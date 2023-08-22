<template>
  <main>
    <logo-chart />

    <h1>
      <a href="https://github.com/ecomfe/vue-echarts">Vue-ECharts</a>
    </h1>
    <p class="desc">
      Vue.js component for Apache ECharts. (<a
        href="https://github.com/ecomfe/vue-echarts#readme"
        >docs</a
      >)
    </p>

    <bar-chart />
    <pie-chart />
    <polar-chart />
    <scatter-chart />
    <geo-chart />
    <radar-chart />
    <connect-chart />
    <gl-chart />
    <manual-chart />

    <footer>
      <a href="//github.com/Justineo">@Justineo</a>|
      <a href="//github.com/ecomfe/vue-echarts/blob/master/LICENSE"
        >MIT License</a
      >|
      <a href="//github.com/ecomfe/vue-echarts">View on GitHub</a>
    </footer>

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

<script setup>
import { ref, watch, provide } from "vue";
import qs from "qs";
import { use } from "echarts/core";
import { CanvasRenderer, SVGRenderer } from "echarts/renderers";
import { INIT_OPTIONS_KEY } from "../ECharts";

import LogoChart from "./examples/LogoChart";
import BarChart from "./examples/BarChart";
import PieChart from "./examples/PieChart";
import PolarChart from "./examples/PolarChart";
import ScatterChart from "./examples/ScatterChart";
import GeoChart from "./examples/GeoChart";
import RadarChart from "./examples/RadarChart";
import ConnectChart from "./examples/ConnectChart";
import GlChart from "./examples/GlChart";
import ManualChart from "./examples/ManualChart";

use([CanvasRenderer, SVGRenderer]);

const options = qs.parse(location.search, { ignoreQueryPrefix: true });
const initOptions = ref({
  renderer: options.renderer || "canvas"
});

provide(INIT_OPTIONS_KEY, initOptions);

watch(initOptions.value, value => {
  let query = qs.stringify(value);
  query = query ? "?" + query : "";
  history.pushState(
    {},
    document.title,
    `${location.origin}${location.pathname}${query}${location.hash}`
  );
});
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

  small {
    font-weight: 300;
  }

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
  border-radius: 0.5em;
  background-color: #fff;
  color: #42b983;
  cursor: pointer;
  font: inherit;
  padding: 0 0.5em;
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
  height: 2em;
}

figure {
  display: flex;
  justify-content: center;
  width: fit-content;
  margin: 2em auto;

  .echarts {
    width: calc(60vw + 4em);
    height: 360px;
    max-width: 720px;
    padding: 1.5em 2em;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 8px;
    box-shadow: 0 0 45px rgba(0, 0, 0, 0.2);
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
    .echarts {
      width: 28vw;
      min-width: 240px;
      padding: 1em 1.5em;
      height: 180px;
    }

    & + & {
      margin-left: 30px;
    }
  }
}

@media (max-width: 980px) {
  p {
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
      line-height: 2em;
      max-width: 40vw;
      border-radius: 0.5em;
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

  .actions {
    display: flex;
    justify-content: center;
  }

  figure {
    width: 100vw;
    margin: 1em auto;

    .echarts {
      width: 100%;
      min-width: 0;
      height: 60vw;
      padding: 1em 0;
      border: none;
      border-radius: 0;
      box-shadow: none;
    }
  }
}

.renderer {
  position: fixed;
  top: 10px;
  left: 10px;
  font-size: 16px;

  button {
    position: relative;
    width: 64px;
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
