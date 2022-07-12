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

To make `vue-echarts` work for *Vue 2* (<2.7.0), you need to have `@vue/composition-api` installed:

```sh
npm i -D @vue/composition-api
```

If you are using *NuxtJS* on top of *Vue 2* (<2.7.0), you'll also need `@nuxtjs/composition-api`:

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
<summary>Vue 3 <!-- vue3DemoLink:start --><a href="https://codesandbox.io/api/v1/sandboxes/define?parameters=N4IgZglgNgpgziAXKCA7AJjAHgOgBYAuAtlEqAMYD2qBMNSIAPAIQAiA8gMIAqAmgAoBRAASESAPgA6qRmKhSZeGAEN0CxnAIBPWAoDEygA6HhwacNEwIAc0KJhAFgAMTw1gDc0gL7TGAek0dGHU_JVV1ACNKdC11dAgAN2EIdABeSRAjQwyFC0YEgFpyPGUAJwJhZQBXAkpS-AgALxhhREpDAghqdJB2zuoMvxD4hPU4clKIDuE4UvIewgJDOEQ_P3J0VBwAKzhMKETSnFQYAj9UQyI_BKqYAAEAZhwAJhwHgHYc_3HJjrGJqYVWbzDKLZardabHZ7GAHBJHE5nC5XGDFMoEOB3ACsbzeXwCAL-vh-gJmcwWBCWKzWGy2u32h2Op3Ol2utwKqJK5UxADYXniQOJvoSCP9fqLpAA1W44CYqWgAQWMAAozKgLOhlARlMqAJSmcwWYT1AhVUrqtVGo19LqoeyWq1G2hYAgAZW0sHthsdRrA1AIADFlERoFp7AByACSNBgpQANMIMgAJWEJU4QcjKYQAORgtwyCYVk2UUATcGUqDgBTgsYgYHD3sdXjjjatnQInoN6p9TuwBHsGW4pWUYEg5GErsoZvI8ALrcdsDA_cTIBnMdKGXnFmbW-EtUoUE6hi93Z7e8m1mssYHIAgtCIc9PPb9pSIWtopRvwGUXmEjAipRDMAES_va5C_qq6BeAApLqm5PlaO4IUasBXhgJ5nhYdQQHQy4ZGm5QZiWj6YcIi54SA5EkZhmravYADau5WhkrAQPU5AENRpEZIIb7QFxmEZAq6A5qcADudQANZwAJZ4ZJKKQwJQwjCTJIAtshPoZK6KhzHgwiCKg1hoLOIBMcIAC6u5IWeNaTPADHmQ6pGoMGMA3kOI5jhOU5zKZGmkRY2iGO5K6GDhsk9sO8RVCsK5Yli0GRT6a4fo5IBYk4SXqSuPJZRkFkBYFtHKI5mk9sAwgJCWtz2A8DxYgmrlEKFLFsainEgMINmBRYlXVVAtXCA8ACMThNW5N68co_FdT1vX9TVoXPA8DgTS1N7CaJBASaU0kZN1RULVVS32CNDXra1IAKZgymqQd82BYtg2hSNWIOAAHJdN46WUxQGUZJlqd15kWIVoPCDARCGCUcAQHFzmBXeUPukEGG9UacAlOglBiQAQoNn7CGNR0Y1jqi4-wo41gQAAa9jjRDVrkzjYmcAedQ3qU1gRDq43CPzgs4FicFmeVPo-OLRqS6RMs9lZyFy9unjdpLXhwd2sqUND1C4cq-FFFynUJtKMCCJwRtwBrFg4EQU40PrIAGMYGS6irwriiEUQxCEcjiCAXiB0AA">Demo →</a><!-- vue3DemoLink:end --></summary>

<!-- vue3Scripts:start -->
```html
<script src="https://cdn.jsdelivr.net/npm/vue@3.2.37"></script>
<script src="https://cdn.jsdelivr.net/npm/echarts@5.3.3"></script>
<script src="https://cdn.jsdelivr.net/npm/vue-echarts@6.2.3"></script>
```
<!-- vue3Scripts:end -->

```js
const app = Vue.createApp(...)

// register globally (or you can do it locally)
app.component('v-chart', VueECharts)
```

</details>

<details>
<summary>Vue 2 <!-- vue2DemoLink:start --><a href="https://codesandbox.io/api/v1/sandboxes/define?parameters=N4IgZglgNgpgziAXKCA7AJjAHgOgBYAuAtlEqAMYD2qBMNSIAPAIQAiA8gMIAqAmgAoBRAASESAPgA6qRmKhSZeGAEN0CxnAIBPWAoDEygA6HhwacNEwIAc0KJhAFgAMTw1gDc0gL7TGAek0dGHU_JVV1ACNKdC11dAgAN2EIdABeSRAjQwyFC0YEgFpyPGUAJwJhZQBXAkpS-AgALxhhREpDAghqdJB2zuoMvxD4hPU4clKIDuE4UvIewgJDOEQ_P3J0VBwAKzhMKETSnFQYAj9UQyI_BKqYAAEAJhwAdhwAZhz_ccmOsYmpiqzeYZRbLVbrTY7PYwA4JI4nM4XK4wYplAhwO4AVne70-AX-v183wBMzmCwISxWaw2W12-0Ox1O50u11uBRRJXKGIAbDgnh8QOIvgSCH8fqLpAA1W44KhEQzUOgEAAUGUKqPKGQANMJpTBBJxOeiAJSeVDSE4Ad11t2VZlQFhh9gyBmM2vMwnQygIymVxtMHos9QIVVKDvtFkjwj6XVQ9gjUcjtCwBAAytpYPHA4mLGBqAQAGLKIjQLT2ADkAEkaDBSjqMgAJGEJU4QcjKYQAORgt21wgAgpNlFAdXBlKg4AU4LWIGBy9mo14tQukxACJmAw6c0nsARnSBuKVlGBIORhKnKKHyPB3Vvt8JYGA98IMtea6UMiuLEuv8JapQoE6QwszvbcCEmaxrFrfc1xgIhb3vXM6iIb1aFKfdgGULxhEYCJSiGYAImw-NyGwu10C8ABSY1P1AxdlzoyNYCgjAQMQ6NJiVfcW3KNthwQxDH2fDIhIE-8vR9ewAG1fyjDJWAgepyAIMTEIyQQUOgVT7wyft0C7U5LTqABrOBtO3DJJRSGBKAHdAzJABj2IsDJUxUOY8GEQRUGsNAbxAWThAAXV_H9GIsadOJWYQZPCyME3Y1BixgfdD2PU9z0vOZ_Kc5ztEMFKXxAQwIBgcycyPeIqmijJMUxSjysTN80Ok2qnAaxyiu5dqMiC3L2Ik5RWrinNgGEBJh1uew3jeTEdSSohCvkxSURUkBhDC5z4vGybCreABGJx5uS_cNOULT1s2rbTB2qApuEB43gcY7Fv3PSDIIIzSlMjINv65yxomu7Cv22aXqWkArMwWy9Icv7AqjQHdvsfbMQcAAOcH9zcspii8ny_LhnwRsjPqEeEODDBKOAIGihLnNgoh0yCNjroikp0EoS0ACE7vQ4RDv-ra4A5rn2BPacCAADXsI7yajEXVC5zgALqfdSmsCJfSO4Qdb1nBMRogKScXcnifY83txCxjLe_M1v28U1fHxcUQiiGIQjkcQQC8X2gA">Demo →</a><!-- vue2DemoLink:end --></summary>

<!-- vue2Scripts:start -->
```html
<script src="https://cdn.jsdelivr.net/npm/vue@2.7.3"></script>
<script src="https://cdn.jsdelivr.net/npm/echarts@5.3.3"></script>
<script src="https://cdn.jsdelivr.net/npm/vue-echarts@6.2.3"></script>
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

- If you are using version prior to `vue@2.7.0`, `@vue/composition-api` is required to be installed to use Vue-ECharts with Vue 2.

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
