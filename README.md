# Vue-ECharts

> ECharts component for Vue.js.

> [🇨🇳 中文版](./README.zh_CN.md)

Built upon [ECharts](http://echarts.baidu.com/index.html) `v4.0.1`+ and depends on [Vue.js](https://vuejs.org/) `v2.2.6`+.

## Installation

### npm (Recommended)

```bash
$ npm install vue-echarts
```

### Manual

Just download `dist/vue-echarts.js` and include it in your HTML file:

```html
<script src="path/to/vue-echarts/dist/vue-echarts.js"></script>
```

## Usage

### ES Modules with npm & vue-loader (Recommended)

```js
import Vue from 'vue'
import ECharts from 'vue-echarts/components/ECharts'

// import ECharts modules manually to reduce bundle size
import 'echarts/lib/chart/bar'
import 'echarts/lib/component/tooltip'

// register component to use
Vue.component('v-chart', ECharts)
```

#### ⚠️ Heads up

##### Importing the souce version

If you are using official Vue CLI to create your project and you want to use the untranspiled component (import `vue-echarts/components/ECharts` rather than import `vue-echarts` directly, to optimize bundle size, which is recommended), you'll encounter the problem that the default configuration will exclude `node_modules` from files to be transpiled by Babel.

For **Vue CLI 3+**, add `vue-echarts` and `resize-detector` into `transpileDependencies` in `vue.config.js` like this:

```js
// vue.config.js
module.exports = {
  transpileDependencies: [
    /\bvue-echarts\b/,
    /\bresize-detector\b/
  ]
}
```

For **Vue CLI 2** with the `webpack` template, modify `build/webpack.base.conf.js` like this:

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

If you are using bare webpack config, just do similar modifications make it work.

#### Using with Nuxt.js

When using Vue-ECharts on the server side with Nuxt.js, it may be not properly transpiled because Nuxt.js has configured an `external` option by default, which prevent files under `node_modules` from being bundled into the server bundle with only a few exceptions. We need to add `vue-echarts` into the `whitelist` as follows:

```js
// Don't forget to
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
            // default value for `whitelist` is
            // [/es6-promise|\.(?!(?:js|json)$).{1,5}$/i]
            whitelist: [/es6-promise|\.(?!(?:js|json)$).{1,5}$/i, /^vue-echarts/]
          })
        ]
      }
    }
  }
}
```

### CommonJS with npm

```js
var Vue = require('vue')

// requiring the UMD module
var ECharts = require('vue-echarts')

// or with vue-loader you can require the src directly
// and import ECharts modules manually to reduce bundle size
var ECharts = require('vue-echarts/components/ECharts')
require('echarts/lib/chart/bar')
require('echarts/lib/component/tooltip')

// register component to use
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
  // register component to use...
  Vue.component('v-chart', ECharts)
})
```

### Global variable

The component is exposed as `window.VueECharts`.

```js
// register component to use
Vue.component('v-chart', VueECharts)
```

## Using the component

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

See more examples [here](https://github.com/Justineo/vue-echarts/tree/master/demo).

### Props *(all reactive)*

* `initOptions`

  Used to initialize ECharts instance.

* `theme`

  The theme used for current ECharts instance.

* `options`

  Used to update data for ECharts instance. Modifying this prop will trigger ECharts' `setOption` method.

  If you mutate the data bound to `options` while retaining the object reference, `setOption` will be called with `notMerge: false`. Otherwise, if you bind a new object to `options`, `setOption` will be called with `notMerge: true`.

  For example, if we have the following template:

  ```html
  <v-chart :options="data"/>
  ```

  Then:

  ```
  this.data = newObject // setOption(this.options, true)
  this.data.title.text = 'Trends' // setOption(this.options, false)
  ```

* `group`

  This prop is automatically bound to the same prop of the ECharts instance.

* `auto-resize` (default: `false`)

  This prop indicates ECharts instance should be resized automatically whenever its root is resized.

* `manual-update` (default: `false`)

  For performance critical scenarios (having a large dataset) we'd better bypass Vue's reactivity system for `options` prop. By specifying `manual-update` prop with `true` and not providing `options` prop, the dataset won't be watched any more. After doing so, you need to retrieve the component instance with `ref` and manually call `mergeOptions` method to update the chart.

### Computed

* `width` **[readonly]**

  Used to retrieve the current width of the ECharts instance.

* `height` **[readonly]**

  Used to retrieve the current height of the ECharts instance.

* `computedOptions` **[readonly]**

  Used to retrive the actual options calculated by ECharts after updating `options`.

### Methods

* `mergeOptions` (use `setOption` in ECharts under the hood)

  *Provides a better method name to describe the actual behavior of `setOption`.*

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

### Static Methods

* `connect`
* `disconnect`
* `registerMap`
* `registerTheme`
* `graphic.clipPointsByRect`
* `graphic.clipRectByRect`

### Events

Vue-ECharts support the following events:

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
* Mouse events
  * `click`
  * `dblclick`
  * `mouseover`
  * `mouseout`
  * `mousedown`
  * `mouseup`
  * `globalout`

For further details, see [ECharts' API documentation](https://ecomfe.github.io/echarts-doc/public/en/api.html).

## Local development

```bash
$ npm i
$ npm run dev
```

Open `http://localhost:8080/demo` to see the demo.
