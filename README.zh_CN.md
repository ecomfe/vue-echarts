# Vue-ECharts

> ECharts 的 Vue.js 组件。

基于 [ECharts](http://echarts.baidu.com/index.html) `v4.0.1`+ 开发，依赖 [Vue.js](https://vuejs.org/) `v2.2.6`+。

## 安装

### npm（推荐方式）

```bash
$ npm install vue-echarts
```

### bower

```bash
$ bower install vue-echarts
```

### 手动安装

直接下载 `dist/vue-echarts.js` 并在 HTML 文件中引入：

```html
<script src="path/to/vue-echarts/dist/vue-echarts.js"></script>
```

## 使用方法

### 用 npm 与 vue-loader 基于 ES Module 引入（推荐用法）

```js
import Vue from 'vue'
import ECharts from 'vue-echarts/components/ECharts.vue'

// 手动引入 ECharts 各模块来减小打包体积
import 'echarts/lib/chart/bar'
import 'echarts/lib/component/tooltip'

// 注册组件后即可使用
Vue.component('v-chart', ECharts)
```

#### ⚠️ 注意事项

##### 引入源码版本

如果你正在使用官方的 Vue CLI 来创建项目并且希望使用未经转译的组件（引入 `vue-echarts/components/ECharts` 而非直接引入 `vue-echarts`）来减小打包尺寸（是推荐用法），会遇到默认配置把 `node_modules` 中的文件排除在 Babel 转译范围以外的问题。

当使用 **Vue CLI 3+** 时，需要在 `vue.config.js` 中的 `transpileDependencies` 增加 `vue-echarts` 及 `resize-detector`，如下：

```js
// vue.config.js
module.exports = {
  transpileDependencies: [
    /\bvue-echarts\b/,
    /\bresize-detector\b/
  ]
}
```

当使用 **Vue CLI 2** 的 `webpack` 模板时，需要按下述的方式修改 `build/webpack.base.conf.js`：

```diff
      {
        test: /\.js$/,
        loader: 'babel-loader',
-       include: [resolve('src'), resolve('test')]
+       include: [
+         resolve('src'),
+         resolve('test'),
+         resolve('node_modules/vue-echarts'),
+         resolve('node_modules/resize-detector')
+       ]
      }
```

如果你正直接配置使用 webpack，那么也请做类似的修改使其能够正常工作。

#### 在 Nuxt.js 中使用

在 Nuxt.js 的服务端中使用 Vue-ECharts 时，可能没有正常转译。这是因为 Nuxt.js 默认配置了 `externals` 选项，会使得 `node_modules` 目录下的绝大多数文件被排除在服务端打包代码以外。需要按如下方式将 `vue-echarts` 加入 `whitelist` 选项：

```js
// 别忘了运行
// npm i --save-dev webpack-node-externals
const nodeExternals = require('webpack-node-externals')

module.exports = {
  // ...
  build: {
    extend (config, { isServer }) {
      // ...
      if (isServer) {
        config.externals = [
          nodeExternals({
            // `whitelist` 选项的默认值是
            // [/es6-promise|\.(?!(?:js|json)$).{1,5}$/i]
            whitelist: [/es6-promise|\.(?!(?:js|json)$).{1,5}$/i, /^vue-echarts/]
          })
        ]
      }
    }
  }
}
```

### 在没有 ES Next 支持环境下用 npm 以 CommonJS 方式引入

```js
var Vue = require('vue')

// 引入 UMD 模块
var ECharts = require('vue-echarts')

// 或者在使用 vue-loader 时可以直接引入源码版本，并且手动
// 引入 ECharts 各个模块来减小打包尺寸
var ECharts = require('vue-echarts/components/ECharts')
require('echarts/lib/chart/bar')
require('echarts/lib/component/tooltip')

// 注册组件后即可使用
Vue.component('v-chart', ECharts)
```

### AMD

```js
require.config({
  paths: {
    'vue': 'path/to/vue',
    'vue-echarts': 'path/to/vue-ehcarts'
  }
})

require(['vue', 'vue-echarts'], function (Vue, ECharts) {
  // 注册组件后即可使用
  Vue.component('v-chart', ECharts)
})
```

### 全局变量

组件将通过 `window.VueECharts` 变量暴露接口：

```js
// 注册组件后即可使用
Vue.component('v-chart', VueECharts)
```

## 调用组件

```vue
<template>
<v-chart :options="polar"/>
</template>

<style>
.echarts {
  width: 100%;
  height: 100%;
}
</style>

<script>
import ECharts from 'vue-echarts/components/ECharts'
import 'echarts/lib/chart/line'
import 'echarts/lib/component/polar'

export default {
  components: {
    chart: ECharts
  },
  data: function () {
    let data = []

    for (let i = 0; i <= 360; i++) {
        let t = i / 180 * Math.PI
        let r = Math.sin(2 * t) * Math.cos(2 * t)
        data.push([r, i])
    }

    return {
      polar: {
        title: {
          text: '极坐标双数值轴'
        },
        legend: {
          data: ['line']
        },
        polar: {
          center: ['50%', '54%']
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross'
          }
        },
        angleAxis: {
          type: 'value',
          startAngle: 0
        },
        radiusAxis: {
          min: 0
        },
        series: [
          {
            coordinateSystem: 'polar',
            name: 'line',
            type: 'line',
            showSymbol: false,
            data: data
          }
        ],
        animationDuration: 2000
      }
    }
  }
}
</script>
```

查看[这里](https://github.com/Justineo/vue-echarts/tree/master/demo)了解更多例子。

### Props *（均为响应式）*

* `initOptions`

  用来初始化 ECharts 实例。

* `theme`

  当前 ECharts 实例使用的主题。

* `options`

  ECharts 实例的数据。修改这个 prop 会触发 ECharts 实例的 `setOption` 方法。

  如果直接修改 `options` 绑定的数据而对象引用保持不变，`setOption` 方法调用时将带有参数 `notMerge: false`。否则，如果为 `options` 绑定一个新的对象，`setOption` 方法调用时则将带有参数 `notMerge: true`。

  例如，如果有如下模板：

  ```html
  <v-chart :options="data"/>
  ```

  那么：

  ```
  this.data = newObject // setOption(this.options, true)
  this.data.title.text = 'Trends' // setOption(this.options, false)
  ```

* `group`

  实例的分组，会自动绑定到 ECharts 组件的同名属性上。

* `auto-resize` （默认值：`false`）

  这个 prop 用来指定 ECharts 实例在组件根元素尺寸变化时是否需要自动进行重绘。

* `manual-update` （默认值：`false`）

  在性能敏感（数据量很大）的场景下，我们最好对于 `options` prop 绕过 Vue 的响应式系统。当将 `manual-update` prop 指定为 `true` 且不传入 `options` prop 时，数据将不会被监听。然后，你需要用 `ref` 获取组件实例以后手动调用 `mergeOptions` 方法来更新图表。

### 计算属性

* `width` **[只读]**

  用来获取 ECharts 实例的当前宽度。

* `height` **[只读]**

  用来获取 ECharts 实例的当前高度。

* `computedOptions` **[只读]**

  用来读取 ECharts 更新内部 `options` 后的实际数据。

### 方法

* `mergeOptions`（底层调用了 ECharts 实例的 `setOption` 方法）

  *提供了一个更贴切的名称来描述 `setOption` 方法的实际行为。*

* `appendData`
* `resize`
* `dispatchAction`
* `showLoading`
* `hideLoading`
* `convertToPixel`
* `convertFromPixel`
* `containPixel`
* `getDataURL`
* `getConnectedDataURL`
* `clear`
* `dispose`

### 静态方法

* `connect`
* `disconnect`
* `registerMap`
* `registerTheme`
* `graphic.clipPointsByRect`
* `graphic.clipRectByRect`

### 事件

Vue-ECharts 支持如下事件：

* `legendselectchanged`
* `legendselected`
* `legendunselected`
* `legendunscroll`
* `datazoom`
* `datarangeselected`
* `timelinechanged`
* `timelineplaychanged`
* `restore`
* `dataviewchanged`
* `magictypechanged`
* `geoselectchanged`
* `geoselected`
* `geounselected`
* `pieselectchanged`
* `pieselected`
* `pieunselected`
* `mapselectchanged`
* `mapselected`
* `mapunselected`
* `axisareaselected`
* `focusnodeadjacency`
* `unfocusnodeadjacency`
* `brush`
* `brushselected`
* `rendered`
* `finished`
* 鼠标事件
  * `click`
  * `dblclick`
  * `mouseover`
  * `mouseout`
  * `mousedown`
  * `mouseup`
  * `globalout`

更多详细信息请参考 [ECharts 的 API 文档](https://ecomfe.github.io/echarts-doc/public/cn/api.html)。

## 本地开发

```bash
$ npm i
$ npm run dev
```

打开 `http://localhost:8080/demo` 来查看 demo。
