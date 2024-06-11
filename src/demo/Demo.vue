<script setup>
import { provide, computed, ref, watch } from "vue";
import { useUrlSearchParams } from "@vueuse/core";
import { use } from "echarts/core";
import { CanvasRenderer, SVGRenderer } from "echarts/renderers";
import { INIT_OPTIONS_KEY } from "../ECharts";
import { track } from "@vercel/analytics";

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

import CodeGen from "./CodeGen";

use([CanvasRenderer, SVGRenderer]);

const params = useUrlSearchParams();
const initOptions = computed(() => ({
  renderer: params.renderer || "canvas"
}));

provide(INIT_OPTIONS_KEY, initOptions);

const codeOpen = ref(location.hash === "#codegen");

if (codeOpen.value) {
  track("codegen", { from: "link" });
}

function openCodegen() {
  codeOpen.value = true;
  track("codegen", { from: "click" });
}

watch(codeOpen, open => {
  if (open) {
    location.hash = "#codegen";
  } else {
    location.hash = "";
  }
});
</script>

<template>
  <main>
    <logo-chart />

    <h1>
      <a href="https://github.com/ecomfe/vue-echarts">Vue-ECharts</a>
    </h1>
    <p class="desc">
      Vue.js component for Apache ECharts™. (<a
        href="https://github.com/ecomfe/vue-echarts#readme"
        >docs</a
      >)
    </p>

    <h2 class="sep">Examples</h2>
    <p>
      <small
        >See
        <a href="https://echarts.apache.org/examples/en/index.html"
          >echarts.apache.org/examples</a
        >
        for all examples.</small
      >
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
        @click="params.renderer = 'canvas'"
      >
        Canvas
      </button>
      <button
        :class="{
          active: initOptions.renderer === 'svg'
        }"
        @click="params.renderer = 'svg'"
      >
        SVG
      </button>
    </aside>

    <aside class="codegen">
      <button @click="openCodegen">
        ✨ <code>import</code> Codegen <span class="badge">beta</span>
      </button>
    </aside>

    <code-gen v-model:open="codeOpen" :renderer="initOptions.renderer" />
  </main>
</template>

<style>
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
  box-shadow: 0 1px 0 0 #42b983;
  transition: box-shadow 0.2s;

  &:hover {
    box-shadow: 0 2px 0 0 #42b983;
  }
}

h1,
h2,
h3 {
  color: #2c3e50;
  font-weight: 400;
}

h1 {
  margin-bottom: 1em;
  font-family: Inter, "Helvetica Neue", Arial, sans-serif;
}

h2 {
  margin-top: 1em;
  margin-bottom: 1em;
}

.sep {
  margin-top: 6em;
  margin-bottom: 1.8em;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  font-size: 1.25em;
  color: #7f8c8d;
  opacity: 0.6;

  &::before,
  &::after {
    content: "";
    display: block;
    width: 48px;
    border-bottom: 1px dotted currentColor;
  }
}

h3 {
  margin-top: 2em;
  padding-top: 1em;
  font-size: 1.2em;

  small {
    font-weight: 300;
    opacity: 0.7;
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

p small {
  font-size: 0.8em;
  color: #7f8c8d;
}

p {
  line-height: 1.5;

  button + button,
  button + select,
  select + button,
  select + select {
    margin-left: 0.5em;
  }
}

pre {
  display: inline-block;
  padding: 0.8em;
  background-color: #f9f9f9;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.125);
  text-align: left;
}
pre,
code,
textarea {
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas,
    "Liberation Mono", monospace;
}

footer {
  margin: 5em 0 3em;
  font-size: 0.5em;
  vertical-align: middle;

  a {
    display: inline-block;
    margin: 0 5px;
    color: #7f8c8d;
    font-size: 2em;
  }
}

h1,
h2,
h3 {
  a,
  a:hover {
    text-decoration: none;
    box-shadow: none;
  }
}

button,
select,
input {
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

button,
input,
label,
select {
  font-size: 0.75em;
  height: 2em;
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
  z-index: 2147483646;

  &.open {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  img {
    position: absolute;
    background-color: #404a59;
    max-width: 80vw;
    border: 2px solid #fff;
    border-radius: 3px;
    box-shadow: 0 0 30px rgba(0, 0, 0, 0.2);
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
}

.actions {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.renderer,
.codegen {
  button {
    position: relative;
    border-color: #36485e;
    color: rgba(54, 72, 94, 0.8);
    font-weight: 500;

    &:focus-visible {
      box-shadow: 0 0 1px #36485e;
    }

    &:active {
      background: rgba(54, 72, 94, 0.2);
    }
  }
}

.renderer {
  position: fixed;
  top: 10px;
  left: 10px;
  font-size: 16px;

  button {
    width: 64px;

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

.codegen {
  display: flex;
  position: fixed;
  top: 10px;
  left: 146px;

  button {
    display: flex;
    align-items: center;
    padding: 0 4px;
    gap: 4px;

    .badge {
      display: block;
      padding: 2px 3px;
      font-size: 10px;
      background: #36485e54;
      color: #fff;
      border-radius: 4px;
    }
  }
}

@media (max-width: 480px) {
  .codegen {
    display: none;
  }
}
</style>
