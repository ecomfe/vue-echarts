# Vue-ECharts

> Vue.js component for Apache ECharts.

> [🇨🇳 中文版](./README.zh-Hans.md)

Uses [Apache ECharts](https://echarts.apache.org/en/index.html) 5 and works for both [Vue.js](https://vuejs.org/) 2/3.

## 💡 Heads up 💡

If you are migrating from `vue-echarts` ≤ 5, you should read the _[Migration to v6](#migration-to-v6)_ section before you update to v6.

Not ready yet? Read documentation for older versions [here →](https://github.com/ecomfe/vue-echarts/tree/5.x)

## Installation & Usage

### npm & ESM

```bash
$ npm install echarts vue-echarts
```

To make `vue-echarts` work for *Vue 2*, you need to have `@vue/composition-api` installed:

```sh
npm i -D @vue/composition-api
```

If you are using *NuxtJS* on top of *Vue 2*, you'll also need `@nuxtjs/composition-api`:

```sh
npm i -D @nuxtjs/composition-api
```

And then add `'@nuxtjs/composition-api/module'` in the `buildModules` option in your `nuxt.config.js`.

<details>
<summary>Vue 3</summary>

```js
import { createApp } from 'vue'
import ECharts from 'vue-echarts'
import { use } from "echarts/core"

// import ECharts modules manually to reduce bundle size
import {
  CanvasRenderer
} from 'echarts/renderers'
import {
  BarChart
} from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent
} from 'echarts/components'

use([
  CanvasRenderer,
  BarChart,
  GridComponent,
  TooltipComponent
])

const app = createApp(...)

// register globally (or you can do it locally)
app.component('v-chart', ECharts)

app.mount(...)
```

</details>

<details>
<summary>Vue 2</summary>

```js
import Vue from 'vue'
import ECharts from 'vue-echarts'
import { use } from 'echarts/core'

// import ECharts modules manually to reduce bundle size
import {
  CanvasRenderer
} from 'echarts/renderers'
import {
  BarChart
} from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent
} from 'echarts/components'

use([
  CanvasRenderer,
  BarChart,
  GridComponent,
  TooltipComponent
]);

// register globally (or you can do it locally)
Vue.component('v-chart', ECharts)

new Vue(...)
```

</details>

We encourage manually importing components and charts from ECharts for smaller bundle size. See all supported renderers/charts/components [here →](https://github.com/apache/echarts/blob/master/src/echarts.all.ts)

But if you really want to import the whole ECharts bundle without having to import modules manually, just add this in your code:

```js
import "echarts";
```

#### SFC example

<details>
<summary>Vue 3 <a href="https://codesandbox.io/s/charming-night-2y6m6?file=/src/App.vue">Demo →</a></summary>

```vue
<template>
  <v-chart class="chart" :option="option" />
</template>

<script>
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { PieChart } from "echarts/charts";
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent
} from "echarts/components";
import VChart, { THEME_KEY } from "vue-echarts";
import { ref, defineComponent } from "vue";

use([
  CanvasRenderer,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent
]);

export default defineComponent({
  name: "HelloWorld",
  components: {
    VChart
  },
  provide: {
    [THEME_KEY]: "dark"
  },
  setup () {
    const option = ref({
      title: {
        text: "Traffic Sources",
        left: "center"
      },
      tooltip: {
        trigger: "item",
        formatter: "{a} <br/>{b} : {c} ({d}%)"
      },
      legend: {
        orient: "vertical",
        left: "left",
        data: ["Direct", "Email", "Ad Networks", "Video Ads", "Search Engines"]
      },
      series: [
        {
          name: "Traffic Sources",
          type: "pie",
          radius: "55%",
          center: ["50%", "60%"],
          data: [
            { value: 335, name: "Direct" },
            { value: 310, name: "Email" },
            { value: 234, name: "Ad Networks" },
            { value: 135, name: "Video Ads" },
            { value: 1548, name: "Search Engines" }
          ],
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: "rgba(0, 0, 0, 0.5)"
            }
          }
        }
      ]
    });

    return { option };
  }
});
</script>

<style scoped>
.chart {
  height: 400px;
}
</style>
```

</details>

<details>
<summary>Vue 2 <a href="https://codesandbox.io/s/suspicious-glitter-mk66j?file=/src/App.vue">Demo →</a></summary>

```vue
<template>
  <v-chart class="chart" :option="option" />
</template>

<script>
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { PieChart } from "echarts/charts";
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent
} from "echarts/components";
import VChart, { THEME_KEY } from "vue-echarts";

use([
  CanvasRenderer,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent
]);

export default {
  name: "HelloWorld",
  components: {
    VChart
  },
  provide: {
    [THEME_KEY]: "dark"
  },
  data() {
    return {
      option: {
        title: {
          text: "Traffic Sources",
          left: "center"
        },
        tooltip: {
          trigger: "item",
          formatter: "{a} <br/>{b} : {c} ({d}%)"
        },
        legend: {
          orient: "vertical",
          left: "left",
          data: [
            "Direct",
            "Email",
            "Ad Networks",
            "Video Ads",
            "Search Engines"
          ]
        },
        series: [
          {
            name: "Traffic Sources",
            type: "pie",
            radius: "55%",
            center: ["50%", "60%"],
            data: [
              { value: 335, name: "Direct" },
              { value: 310, name: "Email" },
              { value: 234, name: "Ad Networks" },
              { value: 135, name: "Video Ads" },
              { value: 1548, name: "Search Engines" }
            ],
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: "rgba(0, 0, 0, 0.5)"
              }
            }
          }
        ]
      }
    };
  }
};
</script>

<style scoped>
.chart {
  height: 400px;
}
</style>
```

</details>

### CDN & Global variable

Drop `<script>` inside your HTML file and access the component via `window.VueECharts`.

<details>
<summary>Vue 3 <!-- vue3DemoLink:start --><a href="https://codesandbox.io/api/v1/sandboxes/define?parameters=N4IgZglgNgpgziAXKCA7AJjAHgOgBYAuAtlEqAMYD2qBMNSIAPAIQAiA8gMIAqAmgAoBRAASESAPgA6qRmKhSZeGAEN0CxnAIBPWAoDEygA6HhwacNEwIAc0KJhAFgAMTw1gDc0gL7TGAek0dGHU_JVV1ACNKdC11dAgAN2EIdABeSRAjQwyFC0YEgFpyPGUAJwJhZQBXAkpS-AgALxhhREpDAghqdJB2zuoMvxD4hPU4clKIDuE4UvIewgJDOEQ_P3J0VBwAKzhMKETSnFQYAj9UQyI_BKqYAAEAZhwAJhwHgHYc_3HJjrGJqYVWbzDKLZardabHZ7GAHBJHE5nC5XGDFMoEOB3ACsbzeXwCAL-vh-gJmcwWBCWKzWGy2u32h2Op3Ol2utwKqJK5UxADYcABGHBOfEkokyUUEBQANVuOAmKloAEFjAAKMyoCzoZQEZQqgCUpnMFmE9QIVVKGvVxuNfS6qHsVutxtoWAIAGVtLAHUancawNQCAAxZREaBaewAcgAkjQYKUADTCDIACVhCVOEHIymEADkYLcMonFZNlFBE3BlKg4AU4HGIGAIz6nV5403rZ0CF7DRrfc7sAR7BluKVlGBIORhG7KObyPBC22nbAwAOkyBZ7HShkFxYW9vhLVKFBOoZvT3e_vJtZrHHByAILQiPOz73_aUiNraKVb8BlF5hIwIlKIZgAiP8HXIP81XQLwAFI9S3Z9rV3RDjVga8MFPc8LDqCA6BXDJ03KTNSyfLDhCXfCQAo0isK1HV7AAbT3a0MlYCB6nIAgaLIjJBHfaBuKwjJFXQXNTgAdzqABrOBBPPDIpRSGBKGEETZJAVsUN9DI3RUOY8GEQRUGsNA5xAZjhAAXT3ZDz1rSZ4EYizHTI1AQxgW9h1HcdJ2nOYzM0siLG0QwPNXQxcLk3sR3iKoVlXLEsRgqLfXXT8nJALEnGSjTVx5bKMkswKgro5QnK03tgGEBJS1uewHgeLFEzcogwtY9jUS4kBhFsoKLCqmqoDq4QHn5Jxmvc28-OUATut6vqBtqsLngeBwJta28RLEghJNKGSMh64qFuqpb7H5Rr1rakBFMwFS1IO-agsWoawv5LEHAADku29dLKYpDOM0z1J6iyLCK0HhBgIhDBKOAIHilygvvKGPSCTC-uNOASnQShxIAISGr9hDGo6Max1RcfYMdawIAANexxoh61yZx8TOEPOpb1KawIl1cbhH5wWcCxeDzIq30fHF41JbImXe2slC5Z3Twe0lrx4J7OVKGh6g8JVAiii5LrExlGBBE4I24A1iwcCIacaH1kADGMDI9RV75CUlXw_CiGIQjkcQQC8YOgA">Demo →</a><!-- vue3DemoLink:end --></summary>

<!-- vue3Scripts:start -->
```html
<script src="https://cdn.jsdelivr.net/npm/vue@3.2.37"></script>
<script src="https://cdn.jsdelivr.net/npm/echarts@5.3.3"></script>
<script src="https://cdn.jsdelivr.net/npm/vue-echarts@6.1.0"></script>
```
<!-- vue3Scripts:end -->

```js
const app = Vue.createApp(...)

// register globally (or you can do it locally)
app.component('v-chart', VueECharts)
```

</details>

<details>
<summary>Vue 2 <!-- vue2DemoLink:start --><a href="https://codesandbox.io/api/v1/sandboxes/define?parameters=N4IgZglgNgpgziAXKCA7AJjAHgOgBYAuAtlEqAMYD2qBMNSIAPAIQAiA8gMIAqAmgAoBRAASESAPgA6qRmKhSZeGAEN0CxnAIBPWAoDEygA6HhwacNEwIAc0KJhAFgAMTw1gDc0gL7TGAek0dGHU_JVV1ACNKdC11dAgAN2EIdABeSRAjQwyFC0YEgFpyPGUAJwJhZQBXAkpS-AgALxhhREpDAghqdJB2zuoMvxD4hPU4clKIDuE4UvIewgJDOEQ_P3J0VBwAKzhMKETSnFQYAj9UQyI_BKqYAAEAJhwANhwARgcc_3HJjrGJqYVWbzDKLZardabHZ7GAHBJHE5nC5XO43GDrShEQyUOAQfqoApGCB3N4vHAPL4BAF_Xw_QEzOYLAhLFZrDZbXb7Q7HU7nS5-GDFMoEOB3ACsOAAzFLKXSaTI5UDGaDmeC2VDObDuYi-Vc0QVBSVyqLXqSnLLqQR_r8rdIAGq3HBULHUOgEAAUGUKQvKGQANMIHTBBJwjSKAJSeVDSE4Ad0Dt3dZlQFlh9gyBmM_vMwnQygIynd4dMOYs9QIVVKKeTFlrwj6XVQ9hrddrtCwBAAytpYM3S62LGBqAQAGLKIjQLT2ADkAEkaDBSgGMgAJWEJU4QcjKYQAORgt39wgAgpNlFAA3BlKg4AU4IuIGBp_2614_S-23jeyWUwO29gCHTEBuFKZQwEgchhE7ShK3IeBs1_P9hFgMBAOEDI4IXUoMg_Cw31w4RakoKBOkMPtEL_AhJmsaxFyAvEYCIBCkMHOoiHzWhSiA4BlC8YRGAiUohmACI-Obcg-KTdAvAAUnDHCKNfd9FNrWBaIwciWPrSY3SAjdyi3c9mJYlC0IyUzjKQvMC3sABtAi6wyVgIHqcgCEsliMkEdjoA8pCMmPdA91OWM6gAazgPy_wyO0UhgSgT3QSKQGUrSLAyTsVDmPBhEEVBrDQeCQAc4QAF0CPwlSLHvHSVmEeyqtrFstNQccYCAkCwIgqCYLmIrUrS7RDHa9CQEMCAYCigdQPiKo6oyMUxRkqbW0wzi7IWpxlpS0bni2jJSoGrTrOUDbGoHYBhASc9bnsSVJTFANWqIEanJcwV3JAYRKrSpqrpukbJTeJwnraoDvOUXyvp-37TH-qBbuEB5JQcUGXqAwLgoIULSgijJvqOtLLuuhGRreB60dekBYswBLAuSgmSrrYmAfsN4xQcAAOSmgMyspily_LCoZnxztrQ6meERjDBKXE6uatKGKIbsgk02HqpKdBKFjAAhBGuOEYHCd-uBNe19hwPvAgAA17BByW61N1Rtc4Yi6iA0prAiQsQeEX3_ZwMV5OKsXX0l0WtIjv9ypUqO8KjPDvEjXwqRtEIohiEI5HEEAvDzoA">Demo →</a><!-- vue2DemoLink:end --></summary>

<!-- vue2Scripts:start -->
```html
<script src="https://cdn.jsdelivr.net/npm/vue@2.6.14"></script>
<script src="https://cdn.jsdelivr.net/npm/@vue/composition-api@1.6.2"></script>
<script src="https://cdn.jsdelivr.net/npm/echarts@5.3.3"></script>
<script src="https://cdn.jsdelivr.net/npm/vue-echarts@6.1.0"></script>
```
<!-- vue2Scripts:end -->

```js
// register globally (or you can do it locally)
Vue.component("v-chart", VueECharts);
```

</details>

See more examples [here](https://github.com/ecomfe/vue-echarts/tree/main/src/demo).

### Props

- `init-options: object`

  Optional chart init configurations. See `echarts.init`'s `opts` parameter [here →](https://echarts.apache.org/en/api.html#echarts.init)

  Injection key: `INIT_OPTIONS_KEY`.

- `theme: string | object`

  Theme to be applied. See `echarts.init`'s `theme` parameter [here →](https://echarts.apache.org/en/api.html#echarts.init)

  Injection key: `THEME_KEY`.

- `option: object`

  ECharts' universal interface. Modifying this prop will trigger ECharts' `setOption` method. Read more [here →](https://echarts.apache.org/en/option.html)

  > 💡 When `update-options` is not specified, `notMerge: false` will be specified by default when the `setOption` method is called if the `option` object is modified directly and the reference remains unchanged; otherwise, if a new reference is bound to `option`, ` notMerge: true` will be specified.

- `update-options: object`

  Options for updating chart option. See `echartsInstance.setOption`'s `opts` parameter [here →](https://echarts.apache.org/en/api.html#echartsInstance.setOption)

  Injection key: `UPDATE_OPTIONS_KEY`.

- `group: string`

  Group name to be used in chart [connection](https://echarts.apache.org/en/api.html#echarts.connect). See `echartsInstance.group` [here →](https://echarts.apache.org/en/api.html#echartsInstance.group)

- `autoresize: boolean` (default: `false`)

  Whether the chart should be resized automatically whenever its root is resized.

- `loading: boolean` (default: `false`)

  Whether the chart is in loading state.

- `loading-options: object`

  Configuration item of loading animation. See `echartsInstance.showLoading`'s `opts` parameter [here →](https://echarts.apache.org/en/api.html#echartsInstance.showLoading)

  Injection key: `LOADING_OPTIONS_KEY`.

- `manual-update: boolean` (default: `false`)

  For performance critical scenarios (having a large dataset) we'd better bypass Vue's reactivity system for `option` prop. By specifying `manual-update` prop with `true` and not providing `option` prop, the dataset won't be watched any more. After doing so, you need to retrieve the component instance with `ref` and manually call `setOption` method to update the chart.

### Provide / Inject

Vue-ECharts provides provide/inject API for `theme`, `init-options`, `update-options` and `loading-options` to help configuring contextual options. eg. for `init-options` you can use the provide API like this:

<details>
<summary>Vue 3</summary>

```js
import { INIT_OPTIONS_KEY } from 'vue-echarts'
import { provide } from 'vue'

// composition API
provide(INIT_OPTIONS_KEY, ...)

// options API
{
  provide: {
    [INIT_OPTIONS_KEY]: { ... }
  }
}
```

</details>

<details>
<summary>Vue 2</summary>

```js
import { INIT_OPTIONS_KEY } from 'vue-echarts'

// in component options
{
  provide: {
    [INIT_OPTIONS_KEY]: { ... }
  }
}
```

</details>

### Methods

- `setOption` [→](https://echarts.apache.org/en/api.html#echartsInstance.setOption)
- `getWidth` [→](https://echarts.apache.org/en/api.html#echartsInstance.getWidth)
- `getHeight` [→](https://echarts.apache.org/en/api.html#echartsInstance.getHeight)
- `getDom` [→](https://echarts.apache.org/en/api.html#echartsInstance.getDom)
- `getOption` [→](https://echarts.apache.org/en/api.html#echartsInstance.getOption)
- `resize` [→](https://echarts.apache.org/en/api.html#echartsInstance.resize)
- `dispatchAction` [→](https://echarts.apache.org/en/api.html#echartsInstance.dispatchAction)
- `convertToPixel` [→](https://echarts.apache.org/en/api.html#echartsInstance.convertToPixel)
- `convertFromPixel` [→](https://echarts.apache.org/en/api.html#echartsInstance.convertFromPixel)
- `containPixel` [→](https://echarts.apache.org/en/api.html#echartsInstance.containPixel)
- `showLoading` [→](https://echarts.apache.org/en/api.html#echartsInstance.showLoading)
- `hideLoading` [→](https://echarts.apache.org/en/api.html#echartsInstance.hideLoading)
- `getDataURL` [→](https://echarts.apache.org/en/api.html#echartsInstance.getDataURL)
- `getConnectedDataURL` [→](https://echarts.apache.org/en/api.html#echartsInstance.getConnectedDataURL)
- `clear` [→](https://echarts.apache.org/en/api.html#echartsInstance.clear)
- `dispose` [→](https://echarts.apache.org/en/api.html#echartsInstance.dispose)

### Static Methods

Static methods can be accessed from [`echarts` itself](https://echarts.apache.org/en/api.html#echarts).

### Events

You can bind events with Vue's `v-on` directive.

```vue
<template>
  <v-chart :option="option" @highlight="handleHighlight"/>
</template>
```

> Only the `.once` event modifier is supported as other modifiers are tightly coupled with the DOM event system.

Vue-ECharts support the following events:

- `highlight` [→](https://echarts.apache.org/en/api.html#events.highlight)
- `downplay` [→](https://echarts.apache.org/en/api.html#events.downplay)
- `selectchanged` [→](https://echarts.apache.org/en/api.html#events.selectchanged)
- `legendselectchanged` [→](https://echarts.apache.org/en/api.html#events.legendselectchanged)
- `legendselected` [→](https://echarts.apache.org/en/api.html#events.legendselected)
- `legendunselected` [→](https://echarts.apache.org/en/api.html#events.legendunselected)
- `legendselectall` [→](https://echarts.apache.org/en/api.html#events.legendselectall)
- `legendinverseselect` [→](https://echarts.apache.org/en/api.html#events.legendinverseselect)
- `legendscroll` [→](https://echarts.apache.org/en/api.html#events.legendscroll)
- `datazoom` [→](https://echarts.apache.org/en/api.html#events.datazoom)
- `datarangeselected` [→](https://echarts.apache.org/en/api.html#events.datarangeselected)
- `timelinechanged` [→](https://echarts.apache.org/en/api.html#events.timelinechanged)
- `timelineplaychanged` [→](https://echarts.apache.org/en/api.html#events.timelineplaychanged)
- `restore` [→](https://echarts.apache.org/en/api.html#events.restore)
- `dataviewchanged` [→](https://echarts.apache.org/en/api.html#events.dataviewchanged)
- `magictypechanged` [→](https://echarts.apache.org/en/api.html#events.magictypechanged)
- `geoselectchanged` [→](https://echarts.apache.org/en/api.html#events.geoselectchanged)
- `geoselected` [→](https://echarts.apache.org/en/api.html#events.geoselected)
- `geounselected` [→](https://echarts.apache.org/en/api.html#events.geounselected)
- `axisareaselected` [→](https://echarts.apache.org/en/api.html#events.axisareaselected)
- `brush` [→](https://echarts.apache.org/en/api.html#events.brush)
- `brushEnd` [→](https://echarts.apache.org/en/api.html#events.brushEnd)
- `brushselected` [→](https://echarts.apache.org/en/api.html#events.brushselected)
- `globalcursortaken` [→](https://echarts.apache.org/en/api.html#events.globalcursortaken)
- `rendered` [→](https://echarts.apache.org/en/api.html#events.rendered)
- `finished` [→](https://echarts.apache.org/en/api.html#events.finished)
- Mouse events
  - `click` [→](https://echarts.apache.org/en/api.html#events.Mouse%20events.click)
  - `dblclick` [→](https://echarts.apache.org/en/api.html#events.Mouse%20events.dblclick)
  - `mouseover` [→](https://echarts.apache.org/en/api.html#events.Mouse%20events.mouseover)
  - `mouseout` [→](https://echarts.apache.org/en/api.html#events.Mouse%20events.mouseout)
  - `mousemove` [→](https://echarts.apache.org/en/api.html#events.Mouse%20events.mousemove)
  - `mousedown` [→](https://echarts.apache.org/en/api.html#events.Mouse%20events.mousedown)
  - `mouseup` [→](https://echarts.apache.org/en/api.html#events.Mouse%20events.mouseup)
  - `globalout` [→](https://echarts.apache.org/en/api.html#events.Mouse%20events.globalout)
  - `contextmenu` [→](https://echarts.apache.org/en/api.html#events.Mouse%20events.contextmenu)
- ZRender events
  - `zr:click`
  - `zr:mousedown`
  - `zr:mouseup`
  - `zr:mousewheel`
  - `zr:dblclick`
  - `zr:contextmenu`

See supported events [here →](https://echarts.apache.org/en/api.html#events)

## Migration to v6

> 💡 Please make sure to read the [migration guide](https://echarts.apache.org/en/tutorial.html#ECharts%205%20Upgrade%20Guide) for ECharts 5 as well.

The following breaking changes are introduced in `vue-echarts@6`:

### Vue 2 support

- Now `@vue/composition-api` is required to be installed to use Vue-ECharts with Vue 2.

### Props

- `options` is renamed to **`option`** to align with ECharts itself.
- Updating `option` will respect **`update-options`** configs instead of checking reference change.
- `watch-shallow` is removed. Use **`manual-update`** for performance critical scenarios.

### Methods

- `mergeOptions` is renamed to **`setOption`** to align with ECharts itself.
- `showLoading` and `hideLoading` is removed. Use the **`loading` and `loading-options`** props instead.
- `appendData` is removed. (Due to ECharts 5's breaking change.)
- All static methods are removed from `vue-echarts`. Use those methods from `echarts` directly.

### Computed getters

- Computed getters (`width`, `height`, `isDisposed` and `computedOptions`) are removed. Use the **`getWidth`, `getHeight`, `isDisposed` and `getOption`** methods instead.

### Styles

- Now the root element of the component have **`100%×100%`** size by default, instead of `600×400`.

## Local development

```bash
$ npm i
$ npm run serve
```

Open `http://localhost:8080` to see the demo.
