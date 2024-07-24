import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const VUE_DEMI_IIFE = readFileSync(
  require.resolve("vue-demi/lib/index.iife.js"),
  "utf8"
);

/** @type {import('rollup').Plugin} */
export const injectVueDemi = {
  name: "inject-vue-demi",
  banner() {
    return `${VUE_DEMI_IIFE};\n;`;
  }
};
