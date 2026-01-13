import { defineConfig } from "tsdown";
import raw from "unplugin-raw/rollup";

export default defineConfig([
  {
    entry: "src/index.ts",
    platform: "browser",
    sourcemap: true,
    copy: ["src/style.css"],
    plugins: [raw()],
  },
  {
    entry: "src/global.ts",
    outputOptions: {
      entryFileNames: "index.min.js", // for unpkg/jsdelivr
      format: "umd",
      name: "VueECharts",
      exports: "default",
      globals: {
        vue: "Vue",
        echarts: "echarts",
        "echarts/core": "echarts",
      },
    },
    platform: "browser",
    sourcemap: true,
    minify: true,
    dts: false,
    plugins: [raw()],
  },
]);
