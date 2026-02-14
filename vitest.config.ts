import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import { playwright } from "@vitest/browser-playwright";

export default defineConfig({
  test: {
    coverage: {
      provider: "istanbul",
      reporter: ["text", "lcov", "html"],
      include: ["src/**/*.{ts,tsx,js,jsx,vue}"],
      exclude: ["src/types.ts"],
      reportsDirectory: "coverage",
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
    include: [],
    projects: [
      {
        plugins: [vue()],
        test: {
          name: "browser",
          globals: true,
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
        test: {
          name: "node",
          globals: true,
          setupFiles: ["./tests/setup.node.ts"],
          include: ["tests/**/*.node.test.ts"],
          environment: "node",
          browser: {
            enabled: false,
          },
        },
      },
    ],
  },
});
