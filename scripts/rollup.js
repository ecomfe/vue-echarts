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
