/* eslint-disable @typescript-eslint/no-var-requires */
const nested = require("postcss-nested");

module.exports = {
  outputDir: "demo",
  transpileDependencies: ["resize-detector"],
  css: {
    loaderOptions: {
      postcss: {
        plugins: [nested()]
      }
    }
  },
  chainWebpack: config => {
    config
      .entry("app")
      .clear()
      .add("./src/demo/main.ts");
  }
};
