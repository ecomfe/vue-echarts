const vue = require('rollup-plugin-vue')
const buble = require('@rollup/plugin-buble')
const { terser } = require('rollup-plugin-terser')
const resolve = require('@rollup/plugin-node-resolve')
const commonjs = require('@rollup/plugin-commonjs')

export default {
  input: 'src/components/ECharts.vue',
  output: {
    file: 'dist/vue-echarts.js',
    name: 'VueECharts',
    format: 'umd',
    globals: {
      vue: 'Vue',
      'echarts/lib/echarts': 'echarts'
    }
  },
  external: [
    'vue',
    'echarts/lib/echarts'
  ],
  plugins: [
    resolve(),
    commonjs(),
    vue({
      compileTemplate: true,
      css: true
    }),
    buble(),
    terser({
      compress: {
        global_defs: {
          __DEV__: process.env.NODE_ENV !== 'production'
        }
      }
    })
  ]
}
