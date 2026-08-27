import { defineConfig } from "tsdown";
import raw from "unplugin-raw/rollup";

export default defineConfig([
  {
    entry: {
      index: "src/index.ts",
      graphic: "src/graphic/index.ts",
    },
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
      },
    },
    platform: "browser",
    sourcemap: true,
    minify: true,
    dts: false,
    plugins: [
      {
        name: "use-full-echarts",
        resolveId: {
          order: "pre",
          handler(source) {
            if (source === "echarts/core") {
              return { id: "echarts", external: true };
            }
          },
        },
      },
      raw(),
    ],
  },
]);
