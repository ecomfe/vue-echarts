import nested from "postcss-nested";

export default {
  outputDir: "demo",
  css: {
    loaderOptions: {
      postcss: {
        postcssOptions: {
          plugins: [nested()]
        }
      }
    }
  },
  chainWebpack: config => {
    config.entry("app").clear().add("./src/demo/main.ts");

    config.module
      .rule("svg")
      .clear()
      .test(/\.svg$/)
      .type("asset/source");

    config.plugin("define").tap(([options]) => [
      {
        ...options,
        __CSP__: "false"
      }
    ]);
  },
  devServer: {
    allowedHosts: "all"
  }
};
