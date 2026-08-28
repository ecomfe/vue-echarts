import { afterEach, vi } from "vitest";
import { cleanup } from "vitest-browser-vue/pure";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  vi.clearAllMocks();
});
