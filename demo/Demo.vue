<script setup lang="ts">
import { provide, computed, ref, watch } from "vue";
import { useScrollLock, useUrlSearchParams } from "@vueuse/core";
import { use, registerTheme } from "echarts/core";
import { CanvasRenderer, SVGRenderer } from "echarts/renderers";
import { track } from "@vercel/analytics";
import darkTheme from "echarts/lib/theme/dark.js";

import { INIT_OPTIONS_KEY, THEME_KEY } from "../src/ECharts";
import type { InitOptions } from "../src/types";

import BarChart from "./examples/BarChart.vue";
import LineChart from "./examples/LineChart.vue";
import PieChart from "./examples/PieChart.vue";
import PolarChart from "./examples/PolarChart.vue";
import ScatterChart from "./examples/ScatterChart.vue";
import GeoChart from "./examples/GeoChart.vue";
import RadarChart from "./examples/RadarChart.vue";
import ConnectChart from "./examples/ConnectChart.vue";
import GlChart from "./examples/GlChart.vue";
import ManualChart from "./examples/ManualChart.vue";
import GraphicOverlay from "./examples/GraphicOverlay.vue";

import CodeGen from "./CodeGen.vue";
import { useDemoDark } from "./composables/useDemoDark";
import { getScrollLockTarget, getScrollbarWidth, isClient, setHash } from "./utils/dom";

type Renderer = "canvas" | "svg";

use([CanvasRenderer, SVGRenderer]);

registerTheme("dark", darkTheme);

const isDark = useDemoDark();

const params = useUrlSearchParams<{ renderer?: Renderer }>();

const selectedRenderer = computed<Renderer>(() => (params.renderer === "svg" ? "svg" : "canvas"));

const initOptions = computed<InitOptions>(() => ({
  renderer: selectedRenderer.value,
}));

const theme = computed(() => (isDark.value ? "dark" : undefined));

provide(INIT_OPTIONS_KEY, initOptions);
provide(THEME_KEY, theme);

const lockTarget = ref<HTMLElement | null>(getScrollLockTarget());
const docRoot = isClient ? document.documentElement : null;

const scrollLock = isClient ? useScrollLock(lockTarget, false) : ref(false);

const initialCodegenOpen = isClient && window.location.hash === "#codegen";
const codeOpen = ref(initialCodegenOpen);

const trackCodegen = (source: "link" | "click"): void => {
  if (isClient) {
    track("codegen", { from: source });
  }
};

if (initialCodegenOpen) {
  trackCodegen("link");
}

function openCodegen(): void {
  codeOpen.value = true;
  trackCodegen("click");
}

const applyCodegenState = (open: boolean): void => {
  if (isClient) {
    if (docRoot) {
      docRoot.style.paddingRight = open ? `${getScrollbarWidth()}px` : "";
    }
    scrollLock.value = open;
  }
  setHash(open ? "#codegen" : "");
};

watch(codeOpen, applyCodegenState, { immediate: true });
</script>

<template>
  <main>
    <img id="logo" src="/favicon.svg" alt="Vue ECharts" />

    <h1>
      <a href="https://github.com/ecomfe/vue-echarts">Vue ECharts</a>
    </h1>
    <p class="desc">Vue.js component for Apache ECharts™.</p>
    <p class="badges">
      <a href="https://npmjs.com/package/vue-echarts"
        ><img alt="npm version" src="https://img.shields.io/npm/v/vue-echarts"
      /></a>
      <a href="https://codecov.io/gh/ecomfe/vue-echarts"
        ><img alt="test coverage" src="https://img.shields.io/codecov/c/github/ecomfe/vue-echarts"
      /></a>
    </p>

    <section class="examples-head" aria-label="Examples">
      <a
        class="examples-deco"
        href="https://echarts.apache.org/examples/en/index.html"
        target="_blank"
        rel="noopener"
        aria-label="All examples"
        title="All examples"
      >
        <span class="rule" aria-hidden="true"></span>
        <span class="dot" aria-hidden="true"></span>
        <span class="dot" aria-hidden="true"></span>
        <span class="dot" aria-hidden="true"></span>
        <span class="rule" aria-hidden="true"></span>
      </a>
    </section>

    <BarChart />
    <LineChart />
    <PieChart />
    <PolarChart />
    <ScatterChart />
    <GeoChart />
    <RadarChart />
    <ConnectChart />
    <GlChart />
    <ManualChart />
    <GraphicOverlay />

    <footer class="site-footer" aria-label="Footer">
      <small class="footer-links">
        <a href="//github.com/ecomfe/vue-echarts/blob/master/LICENSE">MIT</a>
        <span aria-hidden="true">·</span>
        <a href="//github.com/ecomfe/vue-echarts">GitHub</a>
      </small>
    </footer>

    <div class="toolbar" role="toolbar" aria-label="Controls">
      <div
        :class="[
          'toggle',
          'renderer-toggle',
          initOptions.renderer === 'svg' ? 'right-active' : 'left-active',
        ]"
        role="group"
        aria-label="Renderer"
      >
        <div class="indicator" aria-hidden="true"></div>
        <button
          :class="{ active: initOptions.renderer === 'canvas' }"
          :aria-pressed="initOptions.renderer === 'canvas'"
          type="button"
          @click="params.renderer = 'canvas'"
        >
          Canvas
        </button>
        <button
          :class="{ active: initOptions.renderer === 'svg' }"
          :aria-pressed="initOptions.renderer === 'svg'"
          type="button"
          @click="params.renderer = 'svg'"
        >
          SVG
        </button>
      </div>
      <div
        :class="['toggle', 'theme-toggle', isDark ? 'right-active' : 'left-active']"
        role="group"
        aria-label="Theme"
      >
        <div class="indicator" aria-hidden="true"></div>
        <button
          :class="{ active: !isDark }"
          :aria-pressed="!isDark"
          type="button"
          @click="isDark = false"
        >
          Light
        </button>
        <button
          :class="{ active: isDark }"
          :aria-pressed="isDark"
          type="button"
          @click="isDark = true"
        >
          Dark
        </button>
      </div>
      <button class="codegen" type="button" @click="openCodegen">Generate code</button>
    </div>

    <CodeGen v-model:open="codeOpen" :renderer="selectedRenderer" />
  </main>
</template>

<style>
*,
*::before,
*::after {
  box-sizing: border-box;
  scrollbar-width: thin;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  padding: 56px 0 0;
  font-family: var(--font-sans);
  color: var(--muted);
  background: var(--bg);
  text-align: center;
}

a {
  color: var(--link);
  text-decoration: none;
  transition: color 0.2s ease;

  &:hover {
    color: var(--accent-strong);
  }
}

h1 {
  margin-bottom: 1rem;
  font-family: var(--font-sans);
}

h2 {
  margin-top: 1rem;
  margin-bottom: 1rem;
}

h3 {
  margin-top: 2rem;
  padding-top: 1rem;
  font-size: 1.2rem;

  button {
    margin-left: 1rem;
    vertical-align: middle;
  }
}

.desc {
  margin-bottom: 3rem;
  color: var(--muted);

  a {
    color: var(--accent);
  }
}

.badges {
  display: flex;
  gap: var(--space-2);

  a {
    display: flex;
  }
}

p small {
  font-size: 0.8rem;
  color: var(--muted);
}

p {
  line-height: 1.5;

  button + button,
  button + select,
  select + button,
  select + select {
    margin-left: 0.5rem;
  }
}

input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type="number"] {
  appearance: textfield;
}

input[type="text"],
input[type="number"] {
  cursor: text;
}

pre {
  display: inline-block;
  padding: 0.8rem 1rem;
  background-color: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--r-s);
  text-align: left;
}
pre,
code,
textarea {
  font-family: var(--font-mono);
}

.examples-head {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: calc(var(--space-1) * 2.5);
  margin: 3.5rem 0 1.6rem;
  color: var(--muted);
}
.examples-head .examples-deco {
  display: inline-flex;
  align-items: center;
  gap: calc(var(--space-1) * 2.5);
  color: inherit;
  text-decoration: none;
}
.examples-head .examples-deco .rule {
  display: inline-block;
  width: 64px;
  max-width: 20vw;
  height: 1px;
  background: currentColor;
  opacity: 0.35;
}
.examples-head .examples-deco .dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.6;
  display: inline-block;
}

.toolbar {
  position: fixed;
  top: var(--space-4);
  left: var(--space-4);
  z-index: 1000;
  display: inline-flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--r-l);
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--surface) 50%, transparent);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  white-space: nowrap;
}

.toggle {
  position: relative;
  display: inline-flex;
  align-items: stretch;
  gap: 0;
  padding: calc(var(--space-1) * 0.5);
  border: 1px solid var(--border);
  border-radius: var(--r-m);
  background: var(--surface);
  height: 2.25rem;
  flex-shrink: 0;
  overflow: hidden;
}

.toggle .indicator {
  position: absolute;
  top: calc(var(--space-1) * 0.75);
  bottom: calc(var(--space-1) * 0.75);
  left: calc(var(--space-1) * 0.75);
  width: calc(50% - var(--space-1) * 0.75);
  border-radius: calc(var(--r-m) - var(--space-1) * 0.75);
  background: color-mix(in srgb, var(--accent) 18%, var(--surface) 82%);
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.toggle.right-active .indicator {
  transform: translateX(100%);
}

.toggle.left-active .indicator {
  transform: translateX(0);
}

.toggle button {
  position: relative;
  z-index: 1;
  flex: 1;
  border: none;
  background: none;
  color: var(--muted);
  font-size: 0.875rem;
  transition: color 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 var(--space-3);
  height: auto;
  min-width: 0;
}

.toggle button.active {
  color: var(--heading);
}

.toggle button:hover,
.toggle button:active {
  background: none;
}

.toggle button:hover,
.toggle button:focus-visible {
  color: var(--text);
}

.toggle button:focus-visible {
  outline: none;
  box-shadow: none;
}

.toggle button.active:focus-visible {
  box-shadow: var(--focus);
  border-radius: calc(var(--r-m) - 3px);
}

.codegen {
  padding: 0 1rem;
}

.codegen:hover {
  color: var(--heading);
}

@media (max-width: 640px) {
  body {
    padding-bottom: calc(var(--space-1) * 24);
  }

  .examples-head .examples-deco {
    gap: var(--space-2);
  }
  .examples-head .examples-deco .rule {
    width: 36px;
  }

  .toolbar {
    top: auto;
    bottom: calc(var(--space-1) * 5);
    left: 50%;
    transform: translateX(-50%);
    gap: var(--space-2);
    padding: calc(var(--space-1) * 1.5) calc(var(--space-1) * 2.5);
    border-radius: var(--r-m);
  }

  .toggle {
    border-radius: var(--r-m);
  }

  .toggle button {
    font-size: 0.8rem;
  }

  .toggle .indicator {
    top: calc(var(--space-1) * 0.5);
    bottom: calc(var(--space-1) * 0.5);
    left: calc(var(--space-1) * 0.5);
    width: calc(50% - var(--space-1) * 0.5);
    border-radius: calc(var(--r-m) - var(--space-1));
  }

  .codegen {
    display: none;
  }

  .fig > .echarts {
    border-right: none !important;
    border-left: none !important;
    border-radius: 0 !important;
  }
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.fig > .echarts {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-l);
  box-shadow: none;
}

.sep {
  opacity: 0.8;
}
.sep::before,
.sep::after {
  border-bottom-style: solid;
  border-bottom-color: color-mix(in srgb, var(--border) 70%, transparent);
}

.dialog {
  background: var(--surface);
  border: 1px solid var(--border);
}

.message {
  background: var(--text);
  color: var(--surface);
  border: 1px solid color-mix(in srgb, var(--text) 20%, transparent);
}

@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}

h1,
h2,
h3 {
  color: var(--heading);
  font-weight: 400;
  a,
  a:hover {
    text-decoration: none;
    box-shadow: none;
    color: inherit;
  }
}

button,
select,
input:not([type="checkbox"]):not([type="radio"]) {
  font: inherit;
  font-size: 0.9rem;
  color: var(--heading);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-m);
  padding: 0 0.75rem;
  height: 2.25rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  line-height: 1.2;
}

button,
select,
label {
  cursor: pointer;
}

button:hover,
select:hover {
  background: var(--surface-2);
}

button:active {
  background: color-mix(in srgb, var(--surface-2) 70%, var(--surface) 30%);
}

button:focus-visible,
select:focus-visible,
input:not([type="checkbox"]):not([type="radio"]):focus-visible {
  outline: none;
  box-shadow: var(--focus);
}

button[disabled],
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--surface);
  color: var(--muted);
}

button[disabled]:hover,
button:disabled:hover {
  background: var(--surface);
  color: var(--muted);
}

label {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
}

x-vue-echarts {
  text-align: left;
}

#logo {
  display: inline-flex;
  width: 108px;
  height: 108px;
  margin-top: 36px;
  margin-bottom: 12px;
  transform-origin: 50% 50%;
  transition: transform 260ms cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform, box-shadow;
  border-radius: 50%;
}

#logo:hover {
  transform: translateY(-2px) scale(1.045) rotate(-3deg);
  animation: logo-pulse 1400ms ease-out infinite;
}

@keyframes logo-pulse {
  0% {
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 36%, transparent);
  }
  70% {
    box-shadow: 0 0 0 12px color-mix(in srgb, var(--accent) 0%, transparent);
  }
  100% {
    box-shadow: 0 0 0 0 transparent;
  }
}

@media (prefers-reduced-motion: reduce) {
  #logo {
    transition: none;
  }
  #logo:hover {
    transform: none;
    animation: none;
  }
}

.modal {
  display: none;
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background-color: rgba(2, 6, 23, 0.35);
  z-index: 2147483646;

  &.open {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  img {
    position: absolute;
    background-color: var(--surface);
    max-width: 80vw;
    border: 1px solid var(--border);
    border-radius: var(--r-s);
    box-shadow: var(--shadow);
  }
}

@media (max-width: 480px) {
  body .codegen {
    display: none !important;
  }
}

.site-footer {
  margin: 4rem 0 1.25rem;
  text-align: center;
  color: var(--muted);
}
.site-footer a {
  color: inherit;
  text-decoration: none;
}
.site-footer .footer-links {
  font-size: 0.85em;
  display: inline-flex;
  gap: 0.5rem;
  align-items: center;
}
</style>
