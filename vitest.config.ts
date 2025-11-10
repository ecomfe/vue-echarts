import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";
import { playwright } from '@vitest/browser-playwright'

export default mergeConfig(
  viteConfig,
  defineConfig({
    root: ".",
    test: {
      globals: true,
      setupFiles: ["./tests/setup.ts"],
      include: ["tests/**/*.test.ts"],
      coverage: {
        provider: "v8",
        reporter: ["text", "lcov", "html"],
        include: ["src/**/*.{ts,tsx,js,jsx,vue}"],
        exclude: ["src/types.ts"],
        reportsDirectory: "coverage/browser",
      },
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
  }),
);
