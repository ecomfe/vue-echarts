# Vue-ECharts

> Vue.js component for Apache ECharts.

> [🇨🇳 中文版](./README.zh-Hans.md)

Uses [Apache ECharts](http://echarts.baidu.com/index.html) 5 and works for both [Vue.js](https://vuejs.org/) 2/3.

## 💡 Heads up 💡

If your project is using `vue-echarts` ≤ 5, you should read the _[Migration to v6](#migration-to-v6)_ section before you update to v6.

## Installation & Usage

### npm & ESM

```bash
$ npm install echarts vue-echarts
```

To make `vue-echarts` work for Vue 2, you need to have `@vue/composition-api` installed:

```sh
npm i -D @vue/composition-api
```

<details open>
<summary>Vue 3</summary>

```js
import { createApp } from 'vue'
import ECharts from 'vue-echarts'

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

<details open>
<summary>Vue 3</summary>

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
  setup: () => {
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
<summary>Vue 2</summary>

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

<details open>
<summary>Vue 3</summary>

<!-- vue3Scripts:start -->
```html
<script src="https://cdn.jsdelivr.net/npm/vue@3.0.7"></script>
<script src="https://cdn.jsdelivr.net/npm/echarts@5.0.2"></script>
<script src="https://cdn.jsdelivr.net/npm/vue-echarts@6.0.0-beta.3"></script>
```
<!-- vue3Scripts:end -->

```js
const app = Vue.createApp(...)

// register globally (or you can do it locally)
app.component('v-chart', VueECharts)
```

<!-- vue3Demo:start -->[Demo →](https://codesandbox.io/api/v1/sandboxes/define?parameters=N4IgZglgNgpgziAXKCA7AJjAHgOgBYAuAtlEqAMYD2qBMNSIAPAIQAiA8gMIAqAmgAoBRAASESAPgA6qRmKhSZeGAEN0C4cMZQ0Aa2EAnGFAC8kkHAIBPWHCUwCZ0YbCmQOAPRpMucnDhmFRnclVUCAI0p0S0D0CAA3YQh0V2UAB1SA6Q1GOIBacjxlfQJhZQBXAkpDOAgALxhhREpUgghqV2bW6jN3QPdYuMC4cn0IFuE4fXJXQgJUuER3d3J0VBwAKzhMbTj9HFR7d1RUonc4spgAAQBmHAAGHAB2AKDh0ZahkbGSyemzWfmi2Wqw2WyM8T2BwIRxO7hgBSKBDglwArPccAAmF7uN7fT7vH5TGYEOYLJYrNabbYQ_aHY6nc4wXLwwrFZEANnRd1yYXsyhw12xuI-0kYwsJfzcngw2FBQq-Ipk7giUT6cnEIAAvgAaEBeWWbMggKg0OgEBgANQuOBGKloAEF0gAKYBZYToZQEZROgCUwldqA0GkMBDK-kDAaDQc6bVQiH9bqjGloWAIAGUrLB45Gk1GwNQCAAxZREaCWeMAcgAkqb9NrhGYABJGOL2CDkZTCAByMAuZnr9tGyig9bgylQcFycBgozAFcTSZ1C6jrQIWYTgdzQZTBHjZm4-mUYEg5GEacoYfI8H7y6TsDAu4bxrNM7Mt40S83ucqlCgrVS2bvtuowAOYgTOe56rQRA3l-W75voRCerQ-iQcAyiapoYT6L0wBhJh2bkJhLroJqACkPpvnBUafluwiwOBGCAdRSZVBAZqQa2xTtsOsF0Ro96PmYgl8fxHpevGADaQFRmYrAQIY5AOCA2oyUGZiCEh0CifxT72ug3b2AA7lUOj-CpakaGYFpJDAlDCPp5mqSxuZmGmKhTHgwiCKgIFoNeIBqQAukBtFbtOozwFJak5rpqAljAkEHkeJ5nheUwBc5unJpYqSJU-qTsTp_GHrEZQLE-KIomRxV0VetbRSAKJ3DVKlPuyLVmEFWXZeJyjRS5W7AMIcTDhc8bXNcKL1vFRD5XJCnwspwhhdl_ojWN-XXAAjHcM0JZBmnKNpIArT1a3DaNUDjcIGLXAALPtc2QfphkECZ-hmY4q3ZZdm3xttU1PfNIA2Zg9mOd952_Rt135dtKL3QAHMDkHuUUBTeb5_nmStlnCN1-MwEQqSFDUFWxdlEDQRm1j5ZTa22KolBGQAQtdqHCLt0OM4U6As-wx7TgQAAa8Z7fjUZM_zRmcL-VSQfoIFhN6e3CGrGs4CilGBYNuaavjBt63jg0hSxRs0QA3G6RuapRm42pQJPUGaTpmHkCLFP2whWjAgicKySL2xoOBEBeNBuyAADEaQZCAPrW6gWq6vqPh-EaJq0PQiDR7HG4aEoEAgYQ8b3XcdypFgidG1qmqakAA)<!-- vue3Demo:end -->

</details>

<details>
<summary>Vue 2</summary>

<!-- vue2Scripts:start -->
```html
<script src="https://cdn.jsdelivr.net/npm/vue@2.6.12"></script>
<script src="https://cdn.jsdelivr.net/npm/@vue/composition-api@1.0.0-rc.2"></script>
<script src="https://cdn.jsdelivr.net/npm/echarts@5.0.2"></script>
<script src="https://cdn.jsdelivr.net/npm/vue-echarts@6.0.0-beta.3"></script>
```
<!-- vue2Scripts:end -->

```js
// register globally (or you can do it locally)
Vue.component("v-chart", VueECharts);
```

<!-- vue2Demo:start -->[Demo →](https://codesandbox.io/api/v1/sandboxes/define?parameters=N4IgZglgNgpgziAXKCA7AJjAHgOgBYAuAtlEqAMYD2qBMNSIAPAIQAiA8gMIAqAmgAoBRAASESAPgA6qRmKhSZeGAEN0C4cMZQ0Aa2EAnGFAC8kkHAIBPWHCUwCZ0YbCmQOAPRpMucnDhmFRnclVUCAI0p0S0D0CAA3YQh0V2UAB1SA6Q1GOIBacjxlfQJhZQBXAkpDOAgALxhhREpUgghqV2bW6jN3QPdYuMC4cn0IFuE4fXJXQgJUuER3d3J0VBwAKzhMbTj9HFR7d1RUonc4spgAAQAmHAA2HABGa4Cg4dGWoZGxksnps1m80Wy1WGy2RniewOBCOJ3cl3OMGWlCIqUoNS6qFyaQgl0eOAADITclMcC8QOI3t9PtJGO8fhMpjMCHMFksVmtNttIftDsdTjACkUCHBLgBWQlk17uek0mSy35MgEsoHs0FciG7Xkw_lnC65QWFYqih5Egm5ML2ZQ4ADM0oVXw-iv-bk8GGwYPt1IIfQiUT6cnEIAAvgAaEBeD2bMggKg0OgEBgANQuOCoqOoCYAFGY8kLimZQ8IUzBBJwjSKAJQAbmk0gOAHdixcs8AssIjIhhGYAMRpDIgUPt9DKAjKLOV4Rt1AaDSGAhlfQz6ez2edNqoLsr1ez2hYAgAZSssC37Z3s7A1AIADFlERoJYuwByACS8f0RbMAAkjHF7BByGUYQADkYAuQthAAQVGZQoCLOBlFQOBcjgGBRjAJ8zx3MMsNXVoCBPKdcJ3PcCC7MxuH0ZQwEgchhAPShF3IeBC2I1dYDAMju1jBM0LMNjhBwmdz2ESpKCgVpUlPYSRNE0YAHN5LQ8iI1oIhWJkkTL30IhR1ofQVOAZRg00MJ9F6YAwhMrdyBM1t0GDABSSt-M01chNk2AlIwaTZI0KoIATFS_2KADYI0vzhA4rizGiiK_JHMcuwAbQE1czFYCBDHIBxBzS2czEEXToHiyKzEg9AQPsBsqh0fw8rckSzCTJIYEoKD0HqodGvPMwDxUKY8GEQRUHktAWJAfKAF0BI8kTUNGeAUvy7dItQO8YBUyjqNo-jGKmCbusijQrFSTbuNSQLSr8qjYjKBZuLFMVHOu2TmPfZaQDFAkXsHbi7h-swpqO47EuUZaepE4BhDiWCLi7G0bTFIt1qIc6MqywVcsEkHjqnGG4fOm1HgJFGNpUorlBKkAcfy1dodhqB4eEa4bQAFjJtGVIqqqCBq_Q6scOa8YZwmu0eJHOfRkAWswdqKvq2nIfPUWmfOx4xTZgAOKWVP6ooCmG0bxsV4M6eEYHzZgVFChqB7VuOiA1KPaxzodvHbFUSgGwAISZgzhBJ3G8YmQp0G99gaNQggAA0u1J83V098OG04cSqhU_R5LCcdSeEPOC5wMUXMm5XsPNs2y8r2SZsa6vZ2DWthMr4Ma2kENw0jHw_BjONaHoRAQD7dIiOEpQIHkwguzZgkCVSLAm8rkNg2DIA)<!-- vue2Demo:end -->

</details>

See more examples [here](https://github.com/ecomfe/vue-echarts/tree/next/src/demo).

### Props

- `init-options: object`

  Optional chart init configurations. See `echarts.init`'s `opts` parameter [here →](https://echarts.apache.org/en/api.html#echarts.init)

  Injection key: `INIT_OPTIONS_KEY`.

- `theme: string | object`

  Theme to be applied. See `echarts.init`'s `theme` parameter [here →](https://echarts.apache.org/en/api.html#echarts.init)

  Injection key: `THEME_KEY`.

- `option: object`

  ECharts' universal interface. Modifying this prop will trigger ECharts' `setOption` method. Read more [here →](https://echarts.apache.org/en/option.html)

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

<details open>
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
- `containPixel` [→](https://echarts.apache.org/en/api.html#echartsInstance.containPixel)
- `getDataURL` [→](https://echarts.apache.org/en/api.html#echartsInstance.getDataURL)
- `getConnectedDataURL` [→](https://echarts.apache.org/en/api.html#echartsInstance.getConnectedDataURL)
- `clear` [→](https://echarts.apache.org/en/api.html#echartsInstance.clear)
- `dispose` [→](https://echarts.apache.org/en/api.html#echartsInstance.dispose)

### Static Methods

Static methods can be accessed from [`echarts` itself](https://echarts.apache.org/en/api.html#echarts).

### Events

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
