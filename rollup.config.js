const vue = require('rollup-plugin-vue')
const buble = require('rollup-plugin-buble')
const uglify = require('rollup-plugin-uglify')
const resolve = require('rollup-plugin-node-resolve')
const commonjs = require('rollup-plugin-commonjs')

export default {
  input: 'src/index.js',
  output: {
    name: 'VueECharts',
    format: 'umd',
    file: 'dist/vue-echarts.js',
    globals: {
      vue: 'Vue'
    }
  },
  external: [
    'vue'
  ],
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
