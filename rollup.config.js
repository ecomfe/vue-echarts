import typescript from "rollup-plugin-typescript2";
import { terser } from "rollup-plugin-terser";
import resolve from "@rollup/plugin-node-resolve";
import postcss from "rollup-plugin-postcss";
import dts from "rollup-plugin-dts";

/** @type {import('rollup').RollupOptions} */
const options = [
  {
    input: "src/index.ts",
    plugins: [typescript(), postcss()],
    external: ["vue-demi", "echarts/core", "resize-detector"],
    output: [
      {
        file: "dist/index.esm.js",
        format: "es",
        sourcemap: true
      },
      {
        file: "dist/index.esm.min.js",
        format: "es",
        sourcemap: true,
        plugins: [
          terser({
            format: {
              comments: false
            }
          })
        ]
      },
      {
        file: "dist/index.cjs.js",
        format: "cjs",
        sourcemap: true
      },
      {
        file: "dist/index.cjs.min.js",
        format: "cjs",
        sourcemap: true,
        plugins: [
          terser({
            format: {
              comments: false
            }
          })
        ]
      }
    ]
  },
  {
    input: "src/all.ts",
    plugins: [resolve(), typescript(), postcss()],
    external: ["vue-demi", "echarts", "echarts/core"],
    output: [
      {
        file: "dist/index.umd.js",
        format: "umd",
        name: "VueECharts",
        sourcemap: true,
        globals: {
          "vue-demi": "VueDemi",
          echarts: "echarts",
          "echarts/core": "echarts"
        }
      },
      {
        file: "dist/index.umd.min.js",
        format: "umd",
        name: "VueECharts",
        sourcemap: true,
        globals: {
          "vue-demi": "VueDemi",
          echarts: "echarts",
          "echarts/core": "echarts"
        },
        plugins: [
          terser({
            format: {
              comments: false
            }
          })
        ]
      }
    ]
  },
  {
    input: "src/index.ts",
    plugins: [postcss(), dts()],
    output: {
      file: "dist/index.d.ts",
      format: "es"
    }
  }
];

export default options;
