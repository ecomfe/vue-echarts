import type { Option } from "../../src/types";
import { DEMO_TEXT_STYLE } from "../constants";

const POINT_COUNT = 16;
const SYMBOL_COUNT = 6;

function createScatterData(): Array<[number, number, number, number]> {
  return Array.from({ length: POINT_COUNT }, () => [
    Math.random() * 5,
    Math.random() * 4,
    Math.random() * 12,
    Math.round(Math.random() * (SYMBOL_COUNT - 1)),
  ]);
}

const BASE_DATA = createScatterData();

function createOption(data: Array<[number, number, number, number]>): Option {
  return {
    textStyle: { ...DEMO_TEXT_STYLE },
    legend: {
      top: "3%",
      data: ["scatter"],
    },
    tooltip: {
      formatter: "{c}",
    },
    grid: {
      top: "30%",
      right: "18%",
      bottom: "20%",
    },
    xAxis: {
      type: "value",
      splitLine: {
        show: false,
      },
    },
    yAxis: {
      type: "value",
      splitLine: {
        show: false,
      },
    },
    visualMap: [
      {
        realtime: false,
        right: "2%",
        bottom: "3%",
        selectedMode: "multiple",
        dimension: 2,
        selected: [],
        min: 0,
        max: 18,
        precision: 0,
        splitNumber: 0,
        calculable: true,
      },
    ],
    series: [
      {
        name: "scatter",
        type: "scatter",
        symbolSize: 30,
        data,
      },
    ],
  } satisfies Option;
}

export default function getData(): [Option, Option] {
  const options: [Option, Option] = [
    createOption(BASE_DATA),
    createOption(BASE_DATA),
  ];

  return options;
}
