import typescript from "rollup-plugin-typescript2";
import { terser } from "rollup-plugin-terser";
import postcss from "rollup-plugin-postcss";
import resolve from "@rollup/plugin-node-resolve";

/** @type {import('rollup').RollupOptions} */
const options = [
  {
    plugins: [
      typescript({
        useTsconfigDeclarationDir: true
      }),
      postcss()
    ],
    external: ["vue", "echarts/core", "resize-detector"],
    input: "src/index.ts",
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
    plugins: [
      resolve(),
      typescript({
        useTsconfigDeclarationDir: true
      }),
      postcss()
    ],
    external: ["vue", "echarts/core"],
    input: "src/all.ts",
    output: [
      {
        file: "dist/index.umd.js",
        format: "umd",
        name: "VueECharts",
        sourcemap: true,
        globals: {
          vue: "Vue",
          "echarts/core": "echarts"
        }
      },
      {
        file: "dist/index.umd.min.js",
        format: "umd",
        name: "VueECharts",
        sourcemap: true,
        globals: {
          vue: "Vue",
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
  }
];

export default options;
