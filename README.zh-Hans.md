<h1 align="center">Vue-ECharts</h1>

<p align="center">Apache ECharts™ 的 Vue.js 组件。</p>
<p align="center"><a href="https://npmjs.com/package/vue-echarts"><img alt="npm 版本" src="https://img.shields.io/npm/v/vue-echarts"></a> <a href="https://vue-echarts.dev/"><img src="https://img.shields.io/badge/%E6%BC%94%E7%A4%BA%20%C2%BB-20c3aa" alt="查看演示"></a> <a href="./README.zh-Hans.md"></p>
<p align="center"><a href="https:///pr.new/ecomfe/vue-echarts"><img alt="Open in Codeflow" src="https://developer.stackblitz.com/img/open_in_codeflow.svg" height="28"></a> <a href="https://codesandbox.io/p/github/ecomfe/vue-echarts"><img alt="Edit in CodeSandbox" src="https://assets.codesandbox.io/github/button-edit-lime.svg" height="28"></a></p>

---

> 还在使用 v6？可以继续阅读老版本的文档。[前往 →](https://github.com/ecomfe/vue-echarts/blob/6.x/README.zh_CN.md)

## 安装 & 使用

### npm

```sh
npm add echarts vue-echarts
```

#### 示例

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
> 我们鼓励手动从 ECharts 中引入组件和图表，以减小打包体积。我们已经为此构建了一个[导入代码生成器](https://vue-echarts.dev/#codegen)。你只需要把`option` 代码粘贴进去，就可以得到精确的导入代码。
>
> ![](https://github.com/ecomfe/vue-echarts/assets/1726061/f9c38a06-3422-4f0e-ab8c-f242d9aea9aa)
>
> [试一试 →](https://vue-echarts.dev/#codegen)

但如果你实在需要全量引入 ECharts 从而无需手动引入模块，只需要在代码中添加：

```js
import "echarts";
```

### CDN

用如下方式在 HTML 中插入 `<script>` 标签，并且通过 `window.VueECharts` 来访问组件接口：

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

// 全局注册组件（也可以使用局部注册）
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
// 全局注册组件（也可以使用局部注册）
Vue.component("v-chart", VueECharts);
```

</details>

可以在[这里](https://github.com/ecomfe/vue-echarts/tree/main/src/demo)查看更多例子。

### Prop

- `init-options: object`

  初始化附加参数。请参考 `echarts.init` 的 `opts` 参数。[前往 →](https://echarts.apache.org/zh/api.html#echarts.init)

  Inject 键名：`INIT_OPTIONS_KEY`。

- `theme: string | object`

  要应用的主题。请参考 `echarts.init` 的 `theme` 参数。[前往 →](https://echarts.apache.org/zh/api.html#echarts.init)

  Inject 键名：`THEME_KEY`。

- `option: object`

  ECharts 的万能接口。修改这个 prop 会触发 ECharts 实例的 `setOption` 方法。查看[详情 →](https://echarts.apache.org/zh/option.html)

  > 💡 在没有指定 `update-options` 时，如果直接修改 `option` 对象而引用保持不变，`setOption` 方法调用时将默认指定 `notMerge: false`；否则，如果为 `option` 绑定一个新的引用，将指定 `notMerge: true`。

- `update-options: object`

  图表更新的配置项。请参考 `echartsInstance.setOption` 的 `opts` 参数。[前往 →](https://echarts.apache.org/zh/api.html#echartsInstance.setOption)

  Inject 键名：`UPDATE_OPTIONS_KEY`。

- `group: string`

  图表的分组，用于[联动](https://echarts.apache.org/zh/api.html#echarts.connect)。请参考 `echartsInstance.group`。[前往 →](https://echarts.apache.org/zh/api.html#echartsInstance.group)

- `autoresize: boolean | { throttle?: number, onResize?: () => void }`（默认值`false`）

  图表在组件根元素尺寸变化时是否需要自动进行重绘。也可以传入一个选项对象来指定自定义的节流延迟和尺寸变化时的额外回调函数。

- `loading: boolean`（默认值：`false`）

  图表是否处于加载状态。

- `loading-options: object`

  加载动画配置项。请参考 `echartsInstance.showLoading` 的 `opts` 参数。[前往 →](https://echarts.apache.org/zh/api.html#echartsInstance.showLoading)

  Inject 键名：`LOADING_OPTIONS_KEY`。

- `manual-update: boolean`（默认值`false`）

  在性能敏感（数据量很大）的场景下，我们最好对于 `option` prop 绕过 Vue 的响应式系统。当将 `manual-update` prop 指定为 `true` 且不传入 `option` prop 时，数据将不会被监听。然后，需要用 `ref` 获取组件实例以后手动调用 `setOption` 方法来更新图表。

### 事件

可以使用 Vue 的 `v-on` 指令绑定事件。

```vue
<template>
  <v-chart :option="option" @highlight="handleHighlight" />
</template>
```

> **Note**
>
> 仅支持 `.once` 修饰符，因为其它修饰符都与 DOM 事件机制强耦合。

Vue-ECharts 支持如下事件：

- `highlight` [→](https://echarts.apache.org/zh/api.html#events.highlight)
- `downplay` [→](https://echarts.apache.org/zh/api.html#events.downplay)
- `selectchanged` [→](https://echarts.apache.org/zh/api.html#events.selectchanged)
- `legendselectchanged` [→](https://echarts.apache.org/zh/api.html#events.legendselectchanged)
- `legendselected` [→](https://echarts.apache.org/zh/api.html#events.legendselected)
- `legendunselected` [→](https://echarts.apache.org/zh/api.html#events.legendunselected)
- `legendselectall` [→](https://echarts.apache.org/zh/api.html#events.legendselectall)
- `legendinverseselect` [→](https://echarts.apache.org/zh/api.html#events.legendinverseselect)
- `legendscroll` [→](https://echarts.apache.org/zh/api.html#events.legendscroll)
- `datazoom` [→](https://echarts.apache.org/zh/api.html#events.datazoom)
- `datarangeselected` [→](https://echarts.apache.org/zh/api.html#events.datarangeselected)
- `timelinechanged` [→](https://echarts.apache.org/zh/api.html#events.timelinechanged)
- `timelineplaychanged` [→](https://echarts.apache.org/zh/api.html#events.timelineplaychanged)
- `restore` [→](https://echarts.apache.org/zh/api.html#events.restore)
- `dataviewchanged` [→](https://echarts.apache.org/zh/api.html#events.dataviewchanged)
- `magictypechanged` [→](https://echarts.apache.org/zh/api.html#events.magictypechanged)
- `geoselectchanged` [→](https://echarts.apache.org/zh/api.html#events.geoselectchanged)
- `geoselected` [→](https://echarts.apache.org/zh/api.html#events.geoselected)
- `geounselected` [→](https://echarts.apache.org/zh/api.html#events.geounselected)
- `axisareaselected` [→](https://echarts.apache.org/zh/api.html#events.axisareaselected)
- `brush` [→](https://echarts.apache.org/zh/api.html#events.brush)
- `brushEnd` [→](https://echarts.apache.org/zh/api.html#events.brushEnd)
- `brushselected` [→](https://echarts.apache.org/zh/api.html#events.brushselected)
- `globalcursortaken` [→](https://echarts.apache.org/zh/api.html#events.globalcursortaken)
- `rendered` [→](https://echarts.apache.org/zh/api.html#events.rendered)
- `finished` [→](https://echarts.apache.org/zh/api.html#events.finished)
- 鼠标事件
  - `click` [→](https://echarts.apache.org/zh/api.html#events.Mouse%20events.click)
  - `dblclick` [→](https://echarts.apache.org/zh/api.html#events.Mouse%20events.dblclick)
  - `mouseover` [→](https://echarts.apache.org/zh/api.html#events.Mouse%20events.mouseover)
  - `mouseout` [→](https://echarts.apache.org/zh/api.html#events.Mouse%20events.mouseout)
  - `mousemove` [→](https://echarts.apache.org/zh/api.html#events.Mouse%20events.mousemove)
  - `mousedown` [→](https://echarts.apache.org/zh/api.html#events.Mouse%20events.mousedown)
  - `mouseup` [→](https://echarts.apache.org/zh/api.html#events.Mouse%20events.mouseup)
  - `globalout` [→](https://echarts.apache.org/zh/api.html#events.Mouse%20events.globalout)
  - `contextmenu` [→](https://echarts.apache.org/zh/api.html#events.Mouse%20events.contextmenu)
- ZRender 事件
  - `zr:click`
  - `zr:mousedown`
  - `zr:mouseup`
  - `zr:mousewheel`
  - `zr:dblclick`
  - `zr:contextmenu`

请参考支持的事件列表。[前往 →](https://echarts.apache.org/zh/api.html#events)

#### 原生 DOM 事件

由于 Vue-ECharts 默认将事件绑定到 ECharts 实例，因此在使用原生 DOM 事件时需要做一些特殊处理。你需要在事件名称前加上 `native:` 前缀来绑定原生 DOM 事件（可以在 Vue 2 中也可以使用 `.native` 修饰符，但这在 Vue 3 中已被废弃）。

```vue
<template>
  <v-chart @native:click="handleClick" />
</template>
```

### Provide / Inject

Vue-ECharts 为 `theme`、`init-options`、`update-options` 和 `loading-options` 提供了 provide/inject API，以通过上下文配置选项。例如：可以通过如下方式来使用 provide API 为 `init-options` 提供上下文配置：

<details>
<summary>Vue 3</summary>

```js
import { THEME_KEY } from 'vue-echarts'
import { provide } from 'vue'

// 组合式 API
provide(THEME_KEY, 'dark')

// 选项式 API
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

// 组件选项中
{
  provide: {
    [THEME_KEY]: 'dark'
  }
}
```

> **Note**
>
> 在 Vue 2 中，如果你想动态地改变这些选项，那么你需要提供一个对象。
>
> ```js
> // 组件选项中
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

### 方法

- `setOption` [→](https://echarts.apache.org/zh/api.html#echartsInstance.setOption)
- `getWidth` [→](https://echarts.apache.org/zh/api.html#echartsInstance.getWidth)
- `getHeight` [→](https://echarts.apache.org/zh/api.html#echartsInstance.getHeight)
- `getDom` [→](https://echarts.apache.org/zh/api.html#echartsInstance.getDom)
- `getOption` [→](https://echarts.apache.org/zh/api.html#echartsInstance.getOption)
- `resize` [→](https://echarts.apache.org/zh/api.html#echartsInstance.resize)
- `dispatchAction` [→](https://echarts.apache.org/zh/api.html#echartsInstance.dispatchAction)
- `convertToPixel` [→](https://echarts.apache.org/zh/api.html#echartsInstance.convertToPixel)
- `convertFromPixel` [→](https://echarts.apache.org/zh/api.html#echartsInstance.convertFromPixel)
- `containPixel` [→](https://echarts.apache.org/zh/api.html#echartsInstance.containPixel)
- `showLoading` [→](https://echarts.apache.org/zh/api.html#echartsInstance.showLoading)
- `hideLoading` [→](https://echarts.apache.org/zh/api.html#echartsInstance.hideLoading)
- `getDataURL` [→](https://echarts.apache.org/zh/api.html#echartsInstance.getDataURL)
- `getConnectedDataURL` [→](https://echarts.apache.org/zh/api.html#echartsInstance.getConnectedDataURL)
- `clear` [→](https://echarts.apache.org/zh/api.html#echartsInstance.clear)
- `dispose` [→](https://echarts.apache.org/zh/api.html#echartsInstance.dispose)

### 静态方法

静态方法请直接通过 [`echarts` 本身](https://echarts.apache.org/zh/api.html#echarts)进行调用。



## CSP: `style-src` 或 `style-src-elem`

如果你正在应用 CSP 来防止内联 `<style>` 注入，则需要使用 `vue-echarts/csp` 代替 `vue-echarts`，并手动引入 `vue-echarts/csp/style.css`。

## 迁移到 v7

Translate:
Read the breaking changes document in the [release log](https://github.com/ecomfe/vue-echarts/releases/tag/v7.0.0-beta.0) and the migration shoud be straightforward.

请阅读[发布日志](https://github.com/ecomfe/vue-echarts/releases/tag/v7.0.0-beta.0)中的变更记录，之后迁移过程应该会相对简单。

## 本地开发

```sh
pnpm i
pnpm serve
```

打开 `http://localhost:8080` 来查看 demo。

## 声明

The Apache Software Foundation [Apache ECharts, ECharts](https://echarts.apache.org/), Apache, the Apache feather, and the Apache ECharts project logo are either registered trademarks or trademarks of the [Apache Software Foundation](https://www.apache.org/).
