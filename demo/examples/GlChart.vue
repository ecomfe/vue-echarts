<script setup lang="ts">
import { useIntersectionObserver } from "@vueuse/core";
import { defineAsyncComponent, onMounted, shallowRef } from "vue";
import VExample from "./Example.vue";

const stage = shallowRef<HTMLElement | null>(null);
const shouldLoad = shallowRef(false);
const moduleLoaded = shallowRef(false);
const GlobeChart = defineAsyncComponent(async () => {
  const module = await import("./GlobeChart.vue");
  moduleLoaded.value = true;
  return module;
});

const { stop } = useIntersectionObserver(
  stage,
  ([entry]) => {
    if (!entry?.isIntersecting) {
      return;
    }
    shouldLoad.value = true;
    stop();
  },
  { rootMargin: "1000px 0px" },
);

onMounted(() => {
  if (typeof IntersectionObserver === "undefined" || location.hash === "#gl") {
    shouldLoad.value = true;
  }
});
</script>

<template>
  <VExample id="gl" title="GL charts" desc="Globe · Bar3D">
    <div ref="stage" class="echarts gl-stage" style="background-color: #000">
      <span v-if="shouldLoad && !moduleLoaded" class="gl-loading" role="status">
        Loading interactive globe…
      </span>
      <GlobeChart v-if="shouldLoad" />
    </div>
    <template #extra>
      <p>
        You can use extension packs like
        <a href="https://github.com/ecomfe/echarts-gl">ECharts-GL</a>.
      </p>
      <p>
        <small>(You can only use the canvas renderer for GL charts.)</small>
      </p>
    </template>
  </VExample>
</template>

<style scoped>
.gl-stage {
  position: relative;
  overflow: hidden;
}

.gl-loading {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 0.9rem;
}
</style>
