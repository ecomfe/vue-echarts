<template>
  <article>
    <div class="settings">
      <label><input type="checkbox" v-model="autoresize" /> Autoresize</label>
      <label
        ><input type="checkbox" v-model="defaultTheme" /> Default theme</label
      >
      <label><input type="checkbox" v-model="loading" /> Loading</label>
      <label><input type="checkbox" v-model="useSvg" /> Use SVG</label>
      <label><input type="checkbox" v-model="useRef" /> Use ref data</label>
      <button @click="mutate" :disabled="useRef">Mutate data</button>
      <button @click="set" :disabled="!useRef">Set data</button>
      <button @click="mutateLoadingOptions" :disabled="!loading">
        Mutate loading options
      </button>
    </div>
    <v-chart
      style="width: 100%; height: 400px"
      ref="foo"
      :autoresize="autoresize"
      :options="realOptions"
      :loading="loading"
      :loading-options="loadingOptions"
      :theme="defaultTheme ? null : 'dark'"
      :init-options="initOptions"
      @click="log('echarts')"
      @zr:click="log('zr')"
    />
  </article>
</template>

<script lang="ts">
import { computed, defineComponent, reactive, ref } from "vue";
import VChart from "../ECharts";
import * as echarts from "echarts/core";
import { GridComponent } from "echarts/components";
import { LineChart } from "echarts/charts";
import { CanvasRenderer, SVGRenderer } from "echarts/renderers";

echarts.use([GridComponent, LineChart, CanvasRenderer, SVGRenderer]);

export default defineComponent({
  name: "App",
  components: {
    VChart
  },
  setup() {
    const foo = ref();
    const options = reactive({
      xAxis: {
        type: "category",
        data: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      },
      yAxis: {
        type: "value"
      },
      series: [
        {
          data: [150, 230, 224, 218, 135, 147, 260],
          type: "line"
        }
      ]
    });
    const optionsRef = ref({
      xAxis: {
        type: "category",
        data: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      },
      yAxis: {
        type: "value"
      },
      series: [
        {
          data: [233, 128, 184, 302, 208, 287, 212],
          type: "line"
        }
      ]
    });

    const loadingOptions = reactive({
      text: "正在加载..."
    });

    const autoresize = ref<boolean>(true);
    const defaultTheme = ref<boolean>(true);
    const useSvg = ref<boolean>(false);
    const useRef = ref<boolean>(false);
    const loading = ref<boolean>(false);
    const initOptions = computed(() => ({
      renderer: useSvg.value ? "svg" : "canvas"
    }));
    const realOptions = computed(() =>
      useRef.value ? optionsRef.value : options
    );

    function mutate() {
      options.series[0].data = [150, 230, 224, 218, 135, 147, 260].map(
        val => val + Math.round(50 * Math.random())
      );
    }

    function set() {
      optionsRef.value = {
        xAxis: {
          type: "category",
          data: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        },
        yAxis: {
          type: "value"
        },
        series: [
          {
            data: [
              233 + Math.round(50 * Math.random()),
              128 + Math.round(50 * Math.random()),
              184 + Math.round(50 * Math.random()),
              302 + Math.round(50 * Math.random()),
              208 + Math.round(50 * Math.random()),
              287 + Math.round(50 * Math.random()),
              212 + Math.round(50 * Math.random())
            ],
            type: "line"
          }
        ]
      };
    }

    function mutateLoadingOptions() {
      loadingOptions.text += ".";
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function log(...args: any[]) {
      console.log(...args);
    }

    return {
      realOptions,
      autoresize,
      defaultTheme,
      useSvg,
      useRef,
      initOptions,
      mutate,
      set,
      loading,
      loadingOptions,
      mutateLoadingOptions,
      foo,
      log
    };
  }
});
</script>
