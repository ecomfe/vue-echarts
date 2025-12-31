import type { TooltipComponentFormatterCallbackParams } from "echarts";

const baseTooltipParams = {
  componentType: "series",
  componentSubType: "bar",
  componentIndex: 0,
  seriesType: "bar",
  seriesIndex: 0,
  seriesId: "series-0",
  seriesName: "Series",
  name: "item",
  dataIndex: 0,
  data: 0,
  value: 0,
  $vars: [],
} satisfies TooltipComponentFormatterCallbackParams;

export function makeTooltipParams(dataIndex: number): TooltipComponentFormatterCallbackParams {
  return {
    ...baseTooltipParams,
    dataIndex,
  };
}
