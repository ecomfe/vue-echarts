import { readFileSync } from "fs";
import typescript from "rollup-plugin-typescript2";
import { terser } from "rollup-plugin-terser";
import resolve from "@rollup/plugin-node-resolve";
import postcss from "rollup-plugin-postcss";
import dts from "rollup-plugin-dts";

const VUE_DEMI_IIFE = readFileSync(
  require.resolve("vue-demi/lib/index.iife.js"),
  "utf-8"
);

/** @type {import('rollup').Plugin} */
const injectVueDemi = {
  name: "inject-vue-demi",
  banner() {
    return `${VUE_DEMI_IIFE};\n;`;
  }
};

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
    plugins: [resolve(), typescript(), postcss()],
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
    plugins: [postcss(), dts()],
    output: {
      file: "dist/index.d.ts",
      format: "es"
    }
  }
];

export default options;
