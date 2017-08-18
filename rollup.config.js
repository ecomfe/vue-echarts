const vue = require('rollup-plugin-vue')
const buble = require('rollup-plugin-buble')
const uglify = require('rollup-plugin-uglify')
const resolve = require('rollup-plugin-node-resolve')
const commonjs = require('rollup-plugin-commonjs')

export default {
  entry: 'src/index.js',
  external: [
    'vue',
    'echarts'
  ],
  globals: {
    vue: 'Vue',
    echarts: 'echarts'
  },
  format: 'umd',
  moduleName: 'VueECharts',
  dest: 'dist/vue-echarts.js',
  plugins: [
    resolve(),
    commonjs(),
    vue({
      compileTemplate: true,
      css: true
    }),
    buble(),
    uglify({
      compress: {
        global_defs: {
          __DEV__: process.env.NODE_ENV !== 'production'
        }
      }
    })
  ]
}
