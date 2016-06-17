var demo = {
  entry: './demo/demo.js',
  output: {
    path: __dirname,
    filename: 'demo/bundle.js'
  },
  module: {
    loaders: [
      {
        test: /\.vue$/,
        loader: 'vue'
      }
    ]
  },
  vue: {
    autoprefixer: {
      browsers: ['last 2 versions']
    }
  }
}

var build = {
  entry: './src/components/ECharts.vue',
  output: {
    path: __dirname,
    filename: 'dist/vue-echarts.js',
    library: 'VueECharts',
    libraryTarget: 'umd'
  },
  module: {
    loaders: [
      {
        test: /\.vue$/,
        loader: 'vue'
      }
    ]
  },
  vue: {
    autoprefixer: {
      browsers: ['last 2 versions']
    }
  }
}

module.exports = [demo, build]
