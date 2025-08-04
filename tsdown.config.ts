import { defineConfig } from "tsdown/config";
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
      file: "dist/index.min.js", // for unpkg/jsdelivr
      dir: undefined,
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
