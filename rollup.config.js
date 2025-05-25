import replace from "@rollup/plugin-replace";
import esbuild from "rollup-plugin-esbuild";
import { dts } from "rollup-plugin-dts";
import css from "rollup-plugin-import-css";

/**
 * Modifies the Rollup options for a build to support strict CSP
 * @param {import('rollup').RollupOptions} options the original options
 * @param {boolean} csp whether to support strict CSP
 * @returns {import('rollup').RollupOptions} the modified options
 */
function configBuild(options, csp) {
  const result = { ...options };
  const { plugins, output } = result;

  result.plugins = [
    ...(csp ? [replace({ __CSP__: `${csp}`, preventAssignment: true })] : []),
    ...plugins,
    csp ? css({ output: "style.css" }) : css({ inject: true, minify: true }),
  ];

  // modify output file names
  if (csp && output) {
    result.output = (Array.isArray(output) ? output : [output]).map(
      (output) => {
        return {
          ...output,
          file: output.file.replace(/^dist\//, "dist/csp/"),
          assetFileNames: "[name][extname]",
        };
      },
    );
  }

  return result;
}

/** @type {import('rollup').RollupOptions[]} */
const builds = [
  {
    input: "src/index.ts",
    plugins: [esbuild()],
    external: ["vue", /^echarts/],
    output: [
      {
        file: "dist/index.js",
        format: "esm",
        sourcemap: true,
      },
    ],
  },
  {
    input: "src/global.ts",
    plugins: [esbuild({ minify: true })],
    external: ["vue", /^echarts/],
    output: [
      {
        file: "dist/index.min.js", // for unpkg/jsdelivr
        format: "umd",
        name: "VueECharts",
        exports: "default",
        sourcemap: true,
        globals: {
          vue: "vue",
          echarts: "echarts",
          "echarts/core": "echarts",
        },
      },
    ],
  },
];

export default [
  ...builds.map((options) => configBuild(options, false)),
  ...builds.map((options) => configBuild(options, true)),
  {
    input: "src/index.d.ts",
    plugins: [dts()],
    output: [
      {
        file: "dist/index.d.ts",
        format: "esm",
      },
      {
        file: "dist/csp/index.d.ts",
        format: "esm",
      },
    ],
  },
];
