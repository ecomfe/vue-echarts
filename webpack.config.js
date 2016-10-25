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
            },
            {
                test: /\.js$/,
                exclude: /(node_modules|bower_components)/,
                loader: 'babel'
            }
        ]
    },
    resolve: {
        alias: {
            'vue$': 'vue/dist/vue'
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
            },
            {
                test: /\.js$/,
                exclude: /(node_modules|bower_components)/,
                loader: 'babel'
            }
        ]
    },
    resolve: {
        alias: {
            'vue$': 'vue/dist/vue'
        }
    }
}

module.exports = [demo, build]
