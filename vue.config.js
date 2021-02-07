module.exports = {
  outputDir: "demo",
  transpileDependencies: ["resize-detector"],
  chainWebpack: config => {
    config
      .entry("app")
      .clear()
      .add("./src/demo/main.ts");
  }
};
