import type { Option } from "../../src/types";
import { DEMO_TEXT_STYLE } from "../constants";

export default function getData(): Option {
  const option = {
    textStyle: { ...DEMO_TEXT_STYLE },
    title: {
      text: "Traffic Sources",
      top: "5%",
      left: "center",
    },
    tooltip: {
      trigger: "item",
      formatter: "{a} <br/>{b} : {c} ({d}%)",
    },
    legend: {
      orient: "vertical",
      top: "5%",
      left: "5%",
      data: ["Direct", "Email", "Ad Networks", "Video Ads", "Search Engines"],
    },
    series: [
      {
        name: "Traffic Sources",
        type: "pie",
        radius: "55%",
        center: ["50%", "60%"],
        data: [
          { value: 335, name: "Direct" },
          { value: 310, name: "Email" },
          { value: 234, name: "Ad Networks" },
          { value: 135, name: "Video Ads" },
          { value: 1548, name: "Search Engines" },
        ],
      },
    ],
  } satisfies Option;

  return option;
}
