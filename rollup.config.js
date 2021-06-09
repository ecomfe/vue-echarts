import typescript from "rollup-plugin-typescript2";
import { terser } from "rollup-plugin-terser";
import resolve from "@rollup/plugin-node-resolve";
import styles from "rollup-plugin-styles";
import dts from "rollup-plugin-dts";
import { injectVueDemi, ingoreCss } from "./scripts/rollup";

/** @type {import('rollup').RollupOptions} */
const options = [
  {
    input: "src/index.ts",
    plugins: [typescript(), styles()],
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
        exports: "named",
        sourcemap: true
      },
      {
        file: "dist/index.cjs.min.js",
        format: "cjs",
        exports: "named",
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
    input: "src/global.ts",
    plugins: [resolve(), typescript(), styles()],
    external: ["vue-demi", "echarts", "echarts/core"],
    output: [
      {
        file: "dist/index.umd.js",
        format: "umd",
        name: "VueECharts",
        exports: "default",
        sourcemap: true,
        globals: {
          "vue-demi": "VueDemi",
          echarts: "echarts",
          "echarts/core": "echarts"
        },
        plugins: [injectVueDemi]
      },
      {
        file: "dist/index.umd.min.js",
        format: "umd",
        name: "VueECharts",
        exports: "default",
        sourcemap: true,
        globals: {
          "vue-demi": "VueDemi",
          echarts: "echarts",
          "echarts/core": "echarts"
        },
        plugins: [
          injectVueDemi,
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
    plugins: [ingoreCss, dts()],
    output: {
      file: "dist/index.d.ts",
      format: "es"
    }
  }
];

export default options;
