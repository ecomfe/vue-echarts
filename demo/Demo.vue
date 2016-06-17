<template>
<h1><a href="https://github.com/Justineo/vue-echarts">Vue-ECharts</a></h1>
<chart :options="polar"></chart>
</template>

<style>
body {
  margin: 0;
  padding: 3em 0 0;
  font-family: "Source Sans Pro", "Helvetica Neue", Arial, sans-serif;
  color: #666;
  text-align: center;
}

a {
  color: inherit;
  text-decoration: none;
}

h1 {
  margin-bottom: 2em;
  font-family: Dosis, "Source Sans Pro", "Helvetica Neue", Arial, sans-serif;
  color: #2c3e50;
  font-weight: 300;
}

body .echarts {
  height: 300px;
  margin: 0 auto;
}
</style>

<script>
export default {
  data: function () {
    var data = [];

    for (var i = 0; i <= 360; i++) {
        var t = i / 180 * Math.PI;
        var r = Math.sin(2 * t) * Math.cos(2 * t);
        data.push([r, i]);
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
  },
  methods: {
  },
  ready: function () {
  },
  destroy: function () {
  }

}
</script>
