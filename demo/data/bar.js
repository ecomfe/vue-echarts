export default function getData () {
  let items = ['衬衫', '羊毛衫', '雪纺衫', '裤子', '高跟鞋', '袜子']
  return {
    title: {
      text: '异步数据加载示例'
    },
    tooltip: {},
    legend: {
      data: ['销量']
    },
      xAxis: {
      data: items
    },
    yAxis: {
      axisLabel: {show: true}
    },
    series: [{
      type: 'bar',
      name: '销量',
      data: items.map(() => Math.floor(Math.random() * 40 + 10))
    }]
  }
}