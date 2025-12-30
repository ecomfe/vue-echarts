import { afterEach, vi } from "vitest";
import { cleanup } from "vitest-browser-vue/pure";

import { resetDocumentBody } from "./helpers/dom";

// Centralized cleanup for all browser tests
afterEach(() => {
  cleanup();
  resetDocumentBody();
  vi.clearAllMocks();
});
