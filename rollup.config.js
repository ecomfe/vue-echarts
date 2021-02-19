import typescript from "rollup-plugin-typescript2";
import { terser } from "rollup-plugin-terser";
import resolve from "@rollup/plugin-node-resolve";
import dts from "rollup-plugin-dts";

/** @type {import('rollup').RollupOptions} */
const options = [
  {
    input: "src/index.ts",
    plugins: [typescript()],
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
        exports: "default",
        sourcemap: true
      },
      {
        file: "dist/index.cjs.min.js",
        format: "cjs",
        exports: "default",
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
    plugins: [resolve(), typescript()],
    external: ["vue-demi", "echarts/core"],
    output: [
      {
        file: "dist/index.umd.js",
        format: "umd",
        name: "VueECharts",
        sourcemap: true,
        globals: {
          "vue-demi": "VueDemi",
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
    plugins: [dts()],
    output: {
      file: "dist/index.d.ts",
      format: "es"
    }
  }
];

export default options;
