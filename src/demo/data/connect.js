const data1 = [];
const symbolCount = 6;
for (let i = 0; i < 16; i++) {
  data1.push([
    Math.random() * 5,
    Math.random() * 4,
    Math.random() * 12,
    Math.round(Math.random() * (symbolCount - 1))
  ]);
}

const c1 = {
  textStyle: {
    fontFamily: 'Inter, "Helvetica Neue", Arial, sans-serif',
    fontWeight: 300
  },
  legend: {
    top: 20,
    data: ["scatter"]
  },
  tooltip: {
    formatter: "{c}"
  },
  grid: {
    top: "26%",
    bottom: "26%"
  },
  xAxis: {
    type: "value",
    splitLine: {
      show: false
    }
  },
  yAxis: {
    type: "value",
    splitLine: {
      show: false
    }
  },
  visualMap: [
    {
      realtime: false,
      left: "right",
      selectedMode: "multiple",
      dimension: 2,
      selected: [],
      min: 0,
      max: 18,
      precision: 0,
      splitNumber: 0,
      calculable: true
    }
  ],
  series: [
    {
      name: "scatter",
      type: "scatter",
      symbolSize: 30,
      data: data1
    }
  ]
};

const c2 = {
  textStyle: {
    fontFamily: 'Inter, "Helvetica Neue", Arial, sans-serif',
    fontWeight: 300
  },
  legend: {
    top: 20,
    data: ["scatter"]
  },
  tooltip: {
    formatter: "{c}"
  },
  grid: {
    top: "26%",
    bottom: "26%"
  },
  xAxis: {
    type: "value",
    splitLine: {
      show: false
    }
  },
  yAxis: {
    type: "value",
    splitLine: {
      show: false
    }
  },
  visualMap: [
    {
      left: "right",
      selectedMode: "multiple",
      dimension: 2,
      selected: [],
      min: 0,
      max: 18,
      precision: 0,
      splitNumber: 0,
      calculable: true
    }
  ],
  series: [
    {
      name: "scatter",
      type: "scatter",
      symbolSize: 30,
      data: data1
    }
  ]
};

export default function getData() {
  return [c1, c2];
}
