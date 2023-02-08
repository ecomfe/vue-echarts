<h1 align="center">Vue-ECharts</h1>

<p align="center">Apache ECharts <sup>(v5)</sup> 的 Vue.js <sup>(v2/v3)</sup> 组件。</p>
<p align="center"><a href="https://vue-echarts.dev/">查看 Demo →</a></p>
<p align="center"><a href="https:///pr.new/ecomfe/vue-echarts"><img alt="Open in Codeflow" src="https://developer.stackblitz.com/img/open_in_codeflow.svg" height="28"/></a><a href="https://codesandbox.io/p/github/ecomfe/vue-echarts"> <img alt="Edit in CodeSandbox" src="https://assets.codesandbox.io/github/button-edit-lime.svg" height="28"/></a></p>

---

## 💡 注意 💡

若您准备从 `vue-echarts` ≤ 5 的版本迁移到新版本，请在升级 v6 前阅读 _[迁移到 v6](#迁移到-v6)_ 部分文档。

没准备好的话，可以继续阅读老版本的文档。[前往 →](https://github.com/ecomfe/vue-echarts/blob/5.x/README.zh_CN.md)

## 安装 & 使用

### npm & ESM

```bash
$ npm install echarts vue-echarts
```

要在 _Vue 2_（<2.7.0）下使用 `vue-echarts`，需要确保 `@vue/composition-api` 已经安装：

```sh
npm i -D @vue/composition-api
```

如果你在使用基于 _Vue 2_ 的 _NuxtJS_，那么还需要安装 `@nuxtjs/composition-api`：

```sh
npm i -D @nuxtjs/composition-api
```

然后在 `nuxt.config.js` 的 `buildModules` 选项中添加 `'@nuxtjs/composition-api/module'`。

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

为了更小的打包体积，我们建议手动从 ECharts 引入单个图表和组件。请参考所有支持的渲染器/图表/组件。[前往 →](https://github.com/apache/echarts/blob/master/src/echarts.all.ts)

但如果你实在需要全量引入 ECharts 从而无需手动引入模块，只需要在代码中添加：

```js
import "echarts";
```

### CDN & 全局变量

用如下方式在 HTML 中插入 `<script>` 标签，并且通过 `window.VueECharts` 来访问组件接口：

<details>
<summary>Vue 3 <a href="https://stackblitz.com/edit/vue-echarts-vue-3-global?file=index.html">Demo →</a></summary>

<!-- vue3Scripts:start -->
```html
<script src="https://cdn.jsdelivr.net/npm/vue@3.2.45"></script>
<script src="https://cdn.jsdelivr.net/npm/echarts@5.4.1"></script>
<script src="https://cdn.jsdelivr.net/npm/vue-echarts@6.5.4"></script>
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
<script src="https://cdn.jsdelivr.net/npm/vue@2.7.14"></script>
<script src="https://cdn.jsdelivr.net/npm/echarts@5.4.1"></script>
<script src="https://cdn.jsdelivr.net/npm/vue-echarts@6.5.4"></script>
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

- `autoresize: boolean`（默认值`false`）

  图表在组件根元素尺寸变化时是否需要自动进行重绘。

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

如果你正在应用 CSP 来防止内联 `<style>` 注入，则需要使用 `dist/csp` 目录中的文件，并手动引入 `dist/csp/style.css`。

## 迁移到 v6

> 💡 请确保同时查阅 ECharts 5 的[升级指南](https://echarts.apache.org/zh/tutorial.html#ECharts%205%20%E5%8D%87%E7%BA%A7%E6%8C%87%E5%8D%97)。

`vue-echarts@6` 引入了如下破坏性变更：

### Vue 2 支持

- 要在 `vue@2.7.0` 之前的版本中使用 Vue-ECharts，必须安装 `@vue/composition-api`。

### Prop

- `options` 重命名为 **`option`**，以和 ECharts 本身保持一致。
- 更新 `option` 将采用 **`update-options`** 中的配置，不再检查是否发生引用变化。
- `watch-shallow` 被移除。在性能关键场景请使用 **`manual-update`**。

### 方法

- `mergeOptions` 重命名为 **`setOption`**，以和 ECharts 本身保持一致。
- `showLoading` 与 `hideLoading` 被移除。请使用 **`loading` 与 `loading-options`** prop。
- `appendData` 被移除。（由于 ECharts 5 引入的破坏性变更。）
- 所有静态方法被从 `vue-echarts` 移除。可以直接使用 `echarts` 本身的这些方法。

### 计算 Getter

- 计算 getter（`width`、`height`、`isDisposed` 和 `computedOptions`）被移除。请分别使用 **`getWidth`、`getHeight`、`isDisposed` 和 `getOption`** 方法代替。

### 样式

- 现在组件根元素尺寸默认为 **`100%×100%`**，而非原来的 `600×400`。

## 本地开发

```bash
$ npm i
$ npm run serve
```

打开 `http://localhost:8080` 来查看 demo。
