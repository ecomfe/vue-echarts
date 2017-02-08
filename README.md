# Vue-ECharts

> ECharts component for Vue.js.

Built upon [ECharts](http://echarts.baidu.com/index.html) `v3.3.2`+ and depends on [Vue.js](https://vuejs.org/) `v2.0.1`+.

## Installation

### Manual

Just download `dist/vue-echarts.js` and include it in your HTML file:

```html
<script src="path/to/vue-echarts/dist/vue-echarts.js"></script>
```

### npm 

```bash
$ npm install vue-echarts
```

### bower

```bash
$ bower install vue-echarts
```

### manual

Just download `dist/vue-echarts.js` and include it in your HTML file:

```html
<script src="path/to/vue-echarts/dist/vue-echarts.js"></script>
```

## Usage

### ES Modules with NPM & vue-loader (Recommended)

```js
import Vue from 'vue'
import ECharts from 'vue-echarts/components/ECharts.vue'

// import ECharts modules manually to reduce bundle size
import 'echarts/lib/chart/bar'
import 'echarts/lib/component/tooltip'

// register component to use
```

**Heads up**

if you are using `vue-cli` to create your project, the `webpack` template may exclude `node_modules` from files to be transpiled by Babel. Change the `exclude` value from `/node_modules/` to `/node_modules(?![\\/]vue-echarts[\\/])/` to fix the problem.

### CommonJS with NPM without ES Next support

```js
var Vue = require('vue')

// requiring the UMD module
var ECharts = require('vue-echarts')

// or with vue-loader you can require the src directly
// and import ECharts modules manually to reduce bundle size
var ECharts = require('vue-echarts/components/ECharts.vue')
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
  Vue.component('chart', ECharts)
})
```

### Global variable

The component class is exposed as `window.VueECharts`.

```js
// register component to use
Vue.component('chart', VueECharts)
```

## Using the component

```vue
<template>
<chart :options="polar"></chart>
</template>

<style>
.echarts {
  height: 300px;
}
</style>

<script>
export default {
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

### Properties

* `initOptions` & `theme`

  Used to initialize ECharts instance.

* `options` **[reactive]**

  Used to update data for ECharts instance. Modifying this property will trigger ECharts' `setOption` method.

* `group` **[reactive]**

  This property is automatically bound to the same property of the ECharts instance.

* `auto-resize`

  This property indicates ECharts instance should be resized automatically whenever the window is resized.

### Instance Methods

* `mergeOptions` (`setOption` in ECharts)

  *Providing a better method name to describe the actual behavior of `setOption.`*

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

### Events

Vue-ECharts support the following events:

* `legendselectchanged`
* `legendselected`
* `legendunselected`
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
* `brush`
* `brushselected`
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
