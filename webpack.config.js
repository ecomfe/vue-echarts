var path = require('path')
var webpack = require('webpack')
var merge = require('webpack-merge')

var base = {
  resolveLoader: {
    root: path.join(__dirname, 'node_modules'),
  },
  module: {
    loaders: [
      {
        test: /\.vue$/,
        loader: 'vue'
      },
      {
        test: /\.js$/,
        loader: 'babel',
        exclude: /node_modules/
      },
      {
        test: /\.(png|jpg|gif|svg)$/,
        loader: 'file',
        query: {
          name: '[name].[ext]?[hash]'
        }
      }
    ]
  },
  devServer: {
    historyApiFallback: true,
    noInfo: true
  }
}

if (process.env.NODE_ENV === 'production') {
  base.devtool = '#source-map'
  // http://vue-loader.vuejs.org/en/workflow/production.html
  base.plugins = (module.exports.plugins || []).concat([
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: '"production"'
      }
    }),
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false
      }
    })
  ])
}

var demo = merge(base, {
  entry: './demo/index.js',
  output: {
    path: path.resolve(__dirname, './demo'),
    publicPath: '/',
    filename: 'bundle.js'
  }
})

var build = merge(base, {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, './dist'),
    publicPath: '/',
    filename: 'vue-echarts.js',
    library: 'VueECharts',
    libraryTarget: 'umd'
  }
})

module.exports = [demo, build]
