# Vue-ECharts

> ECharts component for Vue.js.

> [🇨🇳 中文版](./README.zh_CN.md)

Built upon [ECharts](http://echarts.baidu.com/index.html) `v4.1.0`+ and depends on [Vue.js](https://vuejs.org/) `v2.2.6`+.

## Installation

### npm (Recommended)

```bash
$ npm install echarts vue-echarts
```

### CDN

Include `echarts` and `vue-echarts` in your HTML file like this:

```html
<script src="https://cdn.jsdelivr.net/npm/echarts@4.1.0/dist/echarts.js"></script>
<script src="https://cdn.jsdelivr.net/npm/vue-echarts@4.0.2"></script>
```

## Usage

### ES Modules with npm & Vue Loader (Recommended)

```js
import Vue from 'vue'
import ECharts from 'vue-echarts' // refers to components/ECharts.vue in webpack

// import ECharts modules manually to reduce bundle size
import 'echarts/lib/chart/bar'
import 'echarts/lib/component/tooltip'

// If you want to use ECharts extensions, just import the extension package and it will work
// Taking ECharts-GL as an example:
// You only need to install the package with `npm install --save echarts-gl` and import it as follows
import 'echarts-gl'

// register component to use
Vue.component('v-chart', ECharts)
```

#### ⚠️ Heads up

##### Importing the source version

Vue-ECharts offers an untranspiled version for webpack by default. If you are using official Vue CLI to create your project, you may encounter the problem that the default configuration will exclude `node_modules` from files to be transpiled by Babel. You need to modify the configuration as follows:

For **Vue CLI 3+**, add `vue-echarts` and `resize-detector` into `transpileDependencies` in `vue.config.js` like this:

```js
// vue.config.js
module.exports = {
  transpileDependencies: [
    'vue-echarts',
    'resize-detector'
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

##### Using with Nuxt.js

When using Vue-ECharts on the server side with Nuxt.js, it may be not properly transpiled because Nuxt.js prevents files under `node_modules` from being bundled into the server bundle with only a few exceptions by default. We need to whitelist `vue-echarts` manually.

For **Nuxt.js v2**, modify `nuxt.config.js` as follows:

```js
module.exports = {
  build: {
    transpile: ['vue-echarts', 'resize-detector']
  }
}
```

For **Nuxt.js v1**, modify `nuxt.config.js` as follows:

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

### AMD

```js
require.config({
  paths: {
    'vue': 'path/to/vue',
    'echarts': 'path/to/echarts',
    'vue-echarts': 'path/to/vue-ehcarts'
  }
})

require(['vue', 'vue-echarts'], function (Vue, ECharts) {
  // register component to use...
  Vue.component('v-chart', ECharts)
})
```

### Global variable

Without any module system, the component is exposed as `window.VueECharts`.

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
/**
 * The default size is 600px×400px, for responsive charts
 * you may need to set percentage values as follows (also
 * don't forget to provide a size for the container).
 */
.echarts {
  width: 100%;
  height: 100%;
}
</style>

<script>
import ECharts from 'vue-echarts'
import 'echarts/lib/chart/line'
import 'echarts/lib/component/polar'

export default {
  components: {
    'v-chart': ECharts
  },
  data () {
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

See more examples [here](https://github.com/ecomfe/vue-echarts/tree/master/src/demo).

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

  ```js
  this.data = newObject // setOption(this.options, true)
  this.data.title.text = 'Trends' // setOption(this.options, false)
  ```

* `group`

  This prop is automatically bound to the same prop of the ECharts instance.

* `autoresize` (default: `false`)

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
* `legendscroll`
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
  * `mousemove`
  * `mousedown`
  * `mouseup`
  * `globalout`
  * `contextmenu`
* ZRender events *(since v4.1.0)*
  * `click`
  * `mousedown`
  * `mouseup`
  * `mousewheel`
  * `dblclick`
  * `contextmenu`

For further details, see [ECharts' API documentation](https://echarts.apache.org/en/api.html).

## Local development

```bash
$ npm i
$ npm run serve 
```

Open `http://localhost:8080/demo` to see the demo.
