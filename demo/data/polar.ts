import type { Option } from "../../src/types";
import { DEMO_TEXT_STYLE } from "../constants";

const points: Array<[number, number]> = [];

for (let i = 0; i <= 360; i += 1) {
  const t = (i / 180) * Math.PI;
  const r = Math.sin(2 * t) * Math.cos(2 * t);
  points.push([r, i]);
}

export default function getData(): Option {
  const option = {
    textStyle: { ...DEMO_TEXT_STYLE },
    title: {
      text: "Dual Numeric Axis",
      top: "5%",
      left: "5%",
    },
    legend: {
      data: ["line"],
      top: "6%",
    },
    polar: {
      radius: "65%",
      center: ["50%", "56%"],
    },
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "cross",
      },
    },
    angleAxis: {
      type: "value",
      startAngle: 0,
    },
    radiusAxis: {
      min: 0,
    },
    series: [
      {
        coordinateSystem: "polar",
        name: "line",
        type: "line",
        showSymbol: false,
        data: points,
      },
    ],
    animationDuration: 2000,
  } satisfies Option;

  return option;
}
