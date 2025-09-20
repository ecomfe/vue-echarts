import { afterEach, vi } from "vitest";
import { cleanup } from "vitest-browser-vue/pure";

import { createEChartsModule } from "./helpers/mock";
import { resetDocumentBody } from "./helpers/dom";

// Mock echarts/core globally for browser tests
vi.mock("echarts/core", () => createEChartsModule());

// Centralized cleanup for all browser tests
afterEach(() => {
  cleanup();
  resetDocumentBody();
});
