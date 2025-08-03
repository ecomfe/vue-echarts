import { defineConfig } from "tsdown/config";

export default defineConfig([
  {
    entry: "src/index.ts",
    platform: "browser",
    sourcemap: true,
    copy: ["src/style.css"],
    loader: { ".css": "text" },
  },
  {
    entry: "src/global.ts",
    outputOptions: {
      file: "dist/index.min.js", // for unpkg/jsdelivr
      format: "umd",
      name: "VueECharts",
      exports: "default",
      globals: {
        vue: "vue",
        echarts: "echarts",
        "echarts/core": "echarts",
      },
    },
    platform: "browser",
    sourcemap: true,
    minify: true,
    dts: false,
    loader: { ".css": "text" },
  },
]);
