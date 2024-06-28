import replace from "@rollup/plugin-replace";
import esbuild from "rollup-plugin-esbuild";
import { dts } from "rollup-plugin-dts";
import css from "rollup-plugin-import-css";
import { ignoreCss } from "./scripts/rollup.mjs";

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
    csp ? css({ output: "style.css" }) : css({ inject: true })
  ];

  // modify output file names
  if (csp && output) {
    result.output = (Array.isArray(output) ? output : [output]).map(output => {
      return {
        ...output,
        file: output.file.replace(/^dist\//, "dist/csp/"),
        assetFileNames: "[name][extname]"
      };
    });
  }

  return result;
}

/** @type {import('rollup').RollupOptions[]} */
const builds = [
  {
    input: "src/index.ts",
    plugins: [esbuild()],
    external: ["vue-demi", /^echarts/],
    output: [
      {
        file: "dist/index.js",
        format: "esm",
        sourcemap: true
      },
      {
        file: "dist/index.cjs",
        format: "cjs",
        exports: "named",
        sourcemap: true
      }
    ]
  },
  {
    input: "src/index.ts",
    plugins: [esbuild({ minify: true })],
    external: ["vue-demi", /^echarts/],
    output: [
      {
        file: "dist/index.min.js", // for unpkg/jsdelivr
        format: "esm",
        sourcemap: true
      }
    ]
  }
];

export default [
  ...builds.map(options => configBuild(options, false)),
  ...builds.map(options => configBuild(options, true)),
  {
    input: "src/index.ts",
    plugins: [
      ignoreCss,
      dts({
        compilerOptions: {
          // see https://github.com/unjs/unbuild/pull/57/files
          preserveSymlinks: false
        }
      })
    ],
    external: ["vue-demi", /^echarts/],
    output: {
      file: "dist/index.vue3.d.ts",
      format: "esm"
    }
  }
];
