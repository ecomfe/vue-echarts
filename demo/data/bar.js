export let initial = {
  title: {
    text: '异步数据加载示例'
  },
  tooltip: {},
  legend: {
    data: ['销量']
  },
  xAxis: {
    data: []
  },
  yAxis: {
    axisLabel: {show: false}
  },
  series: [{
    name: '销量',
    type: 'bar',
    data: []
  }]
}

let asyncData = {
  categories: ['衬衫', '羊毛衫', '雪纺衫', '裤子', '高跟鞋', '袜子'],
  data: [5, 20, 36, 10, 10, 20]
}

export let async = {
  xAxis: {
    data: asyncData.categories
  },
  yAxis: {
    axisLabel: {show: true}
  },
  series: [{
    name: '销量',
    data: asyncData.data
  }]
}
