import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import legacy from "@vitejs/plugin-legacy";
import postcssPresetEnv from "postcss-preset-env";
import browserslist from "browserslist";
import browserslistToEsbuild from "browserslist-to-esbuild";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    legacy({
      modernPolyfills: true,
      renderLegacyChunks: false,
      modernTargets: browserslist()
    })
  ],
  build: { target: browserslistToEsbuild() },
  root: "./src/demo",
  server: {
    host: true
  },
  css: {
    postcss: {
      plugins: [postcssPresetEnv()]
    }
  }
});
