import ECharts from "vue-echarts";

// Simulates a library that re-exports the component and emits its own `.d.ts`.
// Fails with TS4023 / TS2742 if the component type reaches a name no entry point exports.
export const ReExportedChart = ECharts;

export const WrappedChart = {
  component: ECharts,
} as const;
