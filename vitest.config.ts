import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import { playwright } from "@vitest/browser-playwright";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    coverage: {
      provider: "istanbul",
      reporter: ["text", "lcov", "html"],
      include: ["src/**/*.{ts,tsx,js,jsx,vue}"],
      exclude: ["src/types.ts"],
      reportsDirectory: "coverage",
    },
    include: [],
    projects: [
      {
        plugins: [vue()],
        optimizeDeps: { include: ["typescript"] },
        test: {
          name: "browser",
          setupFiles: ["./tests/setup.browser.ts"],
          include: ["tests/**/*.browser.test.ts"],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [
              {
                browser: "chromium",
              },
            ],
          },
        },
      },
      {
        plugins: [vue()],
        resolve: {
          alias: [
            {
              find: /^vue$/,
              // The standalone runtime keeps the complete Vue 3.3 runtime together,
              // independent of the newer Vue packages used by the test tooling.
              replacement: fileURLToPath(
                new URL(
                  "./node_modules/@vue/runtime-dom-3.3/dist/runtime-dom.esm-browser.js",
                  import.meta.url,
                ),
              ),
            },
            {
              find: /^echarts(?=\/|$)/,
              replacement: fileURLToPath(new URL("./node_modules/echarts-6.0", import.meta.url)),
            },
          ],
        },
        test: {
          name: "browser-min",
          setupFiles: ["./tests/setup.browser.ts"],
          include: ["tests/**/*.browser.test.ts", "tests/min-runtime.test.ts"],
          // Demo dependencies have their own Vue requirements. This project checks
          // the library's supported runtime boundary using the existing behavior tests.
          exclude: ["tests/demo-*.browser.test.ts", "tests/option-analysis*.browser.test.ts"],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: "chromium" }],
          },
        },
      },
      {
        test: {
          name: "node",
          setupFiles: ["./tests/setup.node.ts"],
          include: ["tests/**/*.node.test.ts"],
        },
      },
    ],
  },
});
