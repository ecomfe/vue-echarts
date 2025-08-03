import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import postcssNested from "postcss-nested";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    {
      name: "css-as-string",
      enforce: "pre",
      resolveId(source, importer) {
        if (source.endsWith("/style.css")) {
          const resolved = resolve(dirname(importer!), source);
          return resolved + ".js";
        }
      },
      load(id) {
        if (id.endsWith(".css.js")) {
          const cssContent = readFileSync(id.slice(0, -3), "utf-8");
          return `export default ${JSON.stringify(cssContent)};`;
        }
      },
    },
  ],
  root: "./demo",
  server: {
    host: true,
  },
  css: {
    postcss: {
      plugins: [postcssNested()],
    },
  },
});
