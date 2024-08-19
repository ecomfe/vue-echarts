<h1 align="center">Vue-ECharts</h1>

<p align="center">Vue.js component for Apache ECharts™.</p>
<p align="center"><a href="https://npmjs.com/package/vue-echarts"><img alt="npm version" src="https://img.shields.io/npm/v/vue-echarts"></a> <a href="https://vue-echarts.dev/"><img src="https://img.shields.io/badge/Demo%20%C2%BB-20c3aa" alt="View demo"></a> <a href="./README.zh-Hans.md"><img src="https://img.shields.io/badge/%E4%B8%AD%E6%96%87%E7%89%88%20%C2%BB-000" alt="前往中文版"></a></p>
<p align="center"><a href="https:///pr.new/ecomfe/vue-echarts"><img alt="Open in Codeflow" src="https://developer.stackblitz.com/img/open_in_codeflow.svg" height="28"></a> <a href="https://codesandbox.io/p/github/ecomfe/vue-echarts"><img alt="Edit in CodeSandbox" src="https://assets.codesandbox.io/github/button-edit-lime.svg" height="28"></a></p>

---

> Still using v6? Read v6 docs [here →](https://github.com/ecomfe/vue-echarts/tree/6.x)

## Installation & Usage

### npm

```sh
npm add echarts vue-echarts
```

#### Example

<details>
<summary>Vue 3 <a href="https://stackblitz.com/edit/vue-echarts-vue-3?file=src%2FApp.vue">Demo →</a></summary>

```vue
<template>
  <v-chart class="chart" :option="option" />
</template>

<script setup>
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { PieChart } from "echarts/charts";
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent
} from "echarts/components";
import VChart, { THEME_KEY } from "vue-echarts";
import { ref, provide } from "vue";

use([
  CanvasRenderer,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent
]);

provide(THEME_KEY, "dark");

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
</script>

<style scoped>
.chart {
  height: 400px;
}
</style>
```

</details>

<details>
<summary>Vue 2 <a href="https://stackblitz.com/edit/vue-echarts-vue-2?file=src%2FApp.vue">Demo →</a></summary>

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

> [!IMPORTANT]
> We encourage manually importing components and charts from ECharts for smaller bundle size. We've built an [import code generator](https://vue-echarts.dev/#codegen) to help you with that. You can just paste in your `option` code and we'll generate the precise import code for you.
>
> ![](https://github.com/ecomfe/vue-echarts/assets/1726061/f9c38a06-3422-4f0e-ab8c-f242d9aea9aa)
>
> [Try it →](https://vue-echarts.dev/#codegen)

But if you really want to import the whole ECharts bundle without having to import modules manually, just add this in your code:

```js
import "echarts";
```

### CDN

Drop `<script>` inside your HTML file and access the component via `window.VueECharts`.

<details>
<summary>Vue 3 <a href="https://stackblitz.com/edit/vue-echarts-vue-3-global?file=index.html">Demo →</a></summary>

<!-- vue3Scripts:start -->
```html
<script src="https://cdn.jsdelivr.net/npm/vue@3.4.33"></script>
<script src="https://cdn.jsdelivr.net/npm/echarts@5.5.1"></script>
<script src="https://cdn.jsdelivr.net/npm/vue-echarts@7.0.3"></script>
```
<!-- vue3Scripts:end -->

```js
const app = Vue.createApp(...)

// register globally (or you can do it locally)
app.component('v-chart', VueECharts)
```

</details>

<details>
<summary>Vue 2 <a href="https://stackblitz.com/edit/vue-echarts-vue-2-global?file=index.html">Demo →</a></summary>

<!-- vue2Scripts:start -->
```html
<script src="https://cdn.jsdelivr.net/npm/vue@2.7.16"></script>
<script src="https://cdn.jsdelivr.net/npm/echarts@5.5.1"></script>
<script src="https://cdn.jsdelivr.net/npm/vue-echarts@7.0.3"></script>
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

- `autoresize: boolean | { throttle?: number, onResize?: () => void }` (default: `false`)

  Whether the chart should be resized automatically whenever its root is resized. Use the options object to specify a custom throttle delay (in milliseconds) and/or an extra resize callback function.

- `loading: boolean` (default: `false`)

  Whether the chart is in loading state.

- `loading-options: object`

  Configuration item of loading animation. See `echartsInstance.showLoading`'s `opts` parameter [here →](https://echarts.apache.org/en/api.html#echartsInstance.showLoading)

  Injection key: `LOADING_OPTIONS_KEY`.

- `manual-update: boolean` (default: `false`)

  For performance critical scenarios (having a large dataset) we'd better bypass Vue's reactivity system for `option` prop. By specifying `manual-update` prop with `true` and not providing `option` prop, the dataset won't be watched any more. After doing so, you need to retrieve the component instance with `ref` and manually call `setOption` method to update the chart.

### Events

You can bind events with Vue's `v-on` directive.

```vue
<template>
  <v-chart :option="option" @highlight="handleHighlight" />
</template>
```

> **Note**
>
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

#### Native DOM Events

As Vue-ECharts binds events to the ECharts instance by default, there is some caveat when using native DOM events. You need to prefix the event name with `native:` to bind native DOM events (or you can use the `.native` modifier in Vue 2, which is dropped in Vue 3).

```vue
<template>
  <v-chart @native:click="handleClick" />
</template>
```

### Provide / Inject

Vue-ECharts provides provide/inject API for `theme`, `init-options`, `update-options` and `loading-options` to help configuring contextual options. eg. for `init-options` you can use the provide API like this:

<details>
<summary>Vue 3</summary>

```js
import { THEME_KEY } from 'vue-echarts'
import { provide } from 'vue'

// composition API
provide(THEME_KEY, 'dark')

// options API
{
  provide: {
    [THEME_KEY]: 'dark'
  }
}
```

</details>

<details>
<summary>Vue 2</summary>

```js
import { THEME_KEY } from 'vue-echarts'

// in component options
{
  provide: {
    [THEME_KEY]: 'dark'
  }
}
```

> **Note**
>
> You need to provide an object for Vue 2 if you want to change it dynamically.
>
> ```js
> // in component options
> {
>   data () {
>     return {
>       theme: { value: 'dark' }
>     }
>   },
>   provide () {
>     return {
>       [THEME_KEY]: this.theme
>     }
>   }
> }
> ```

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

## CSP: `style-src` or `style-src-elem`

If you are applying a CSP to prevent inline `<style>` injection, you need to use `vue-echarts/csp` instead of `vue-echarts` and include `vue-echarts/csp/style.css` manually.

## Migration to v7

Read the breaking changes document in the [release log](https://github.com/ecomfe/vue-echarts/releases/tag/v7.0.0-beta.0) and the migration shoud be straightforward.

## Local development

```sh
pnpm i
pnpm serve
```

Open `http://localhost:8080` to see the demo.

## Notice

The Apache Software Foundation [Apache ECharts, ECharts](https://echarts.apache.org/), Apache, the Apache feather, and the Apache ECharts project logo are either registered trademarks or trademarks of the [Apache Software Foundation](https://www.apache.org/).
