import { readFileSync } from "fs";

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

const EMPTY_FILE_ID = "__rollup_empty__";

/** @type {import('rollup').Plugin} */
export const ingoreCss = {
  name: "ignore-css",
  resolveId(source) {
    if (source.endsWith(".css")) {
      return EMPTY_FILE_ID;
    }
    return null;
  },
  load(id) {
    return id === EMPTY_FILE_ID ? "" : null;
  }
};
