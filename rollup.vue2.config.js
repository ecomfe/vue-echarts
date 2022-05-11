import dts from "rollup-plugin-dts";

/** @type {import('rollup').RollupOptions[]} */
const options = [
  {
    input: "src/index.vue2.d.ts",
    plugins: [dts()],
    output: {
      file: "dist/index.vue2.d.ts",
      format: "esm"
    }
  }
];

export default options;
