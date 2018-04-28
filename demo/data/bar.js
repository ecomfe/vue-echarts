export default function getData () {
  return {
    legend: {},
    tooltip: {},
    dataset: {
      // Provide data.
      source: [
        ['Product', '2015', '2016', '2017'],
        ['Matcha Latte', ...randomize()],
        ['Milk Tea', ...randomize()],
        ['Cheese Cocoa', ...randomize()],
        ['Walnut Brownie', ...randomize()]
      ]
    },
    // Declare X axis, which is a category axis, mapping
    // to the first column by default.
    xAxis: { type: 'category' },
    // Declare Y axis, which is a value axis.
    yAxis: {},
    // Declare several series, each of them mapped to a
    // column of the dataset by default.
    series: [{ type: 'bar' }, { type: 'bar' }, { type: 'bar' }]
  }
}

function randomize () {
  return [0, 0, 0].map(v => {
    return Math.round(300 + Math.random() * 700) / 10
  })
}
