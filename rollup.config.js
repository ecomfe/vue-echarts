import esbuild from "rollup-plugin-esbuild";
import { dts } from "rollup-plugin-dts";
import { defineConfig } from "rollup";
import copy from "rollup-plugin-copy";

import fs from "node:fs";
import path from "node:path";

/** @type {() => import('rollup').Plugin} */
function raw() {
  return {
    name: "raw",

    // Catch imports ending with '?raw'
    resolveId(source, importer) {
      if (!source.endsWith("?raw")) return null;
      const [filepath] = source.split("?");
      const resolved = path.resolve(path.dirname(importer), filepath);
      // preserve the '?raw' suffix so load() can detect it
      return resolved + "?raw";
    },

    // load the file contents and export as a JS string
    load(id) {
      if (!id.endsWith("?raw")) return null;
      const filepath = id.slice(0, -4); // strip '?raw'
      const raw = fs.readFileSync(filepath, "utf-8");
      return `export default ${JSON.stringify(raw)};`;
    },
  };
}

export default defineConfig([
  {
    input: "src/index.ts",
    plugins: [
      esbuild(),
      raw(),
      copy({ targets: [{ src: "src/style.css", dest: "dist" }] }),
    ],
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
    plugins: [esbuild({ minify: true }), raw()],
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
  {
    input: "src/index.ts",
    plugins: [
      dts({
        // https://github.com/unjs/unbuild/pull/57/files
        compilerOptions: {
          preserveSymlinks: false,
        },
      }),
    ],
    output: [
      {
        file: "dist/index.d.ts",
        format: "esm",
      },
    ],
  },
]);
