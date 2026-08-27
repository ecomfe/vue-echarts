import { describe, it, expect, vi } from "vitest";

import entry, * as moduleExports from "../src/index";
import globalEntry from "../src/global";

import ECharts from "../src/ECharts";

describe("entry points", () => {
  it("re-export ECharts correctly from src/index.ts", () => {
    expect(entry).toBe(ECharts);
    expect(moduleExports.default).toBe(ECharts);
  });

  it("global entry merges default and named exports", () => {
    expect(globalEntry).toBe(ECharts);
    expect(globalEntry.default).toBe(ECharts);
    expect(Object.keys(globalEntry)).toEqual(expect.arrayContaining(Object.keys(moduleExports)));
  });

  it("shares injection keys across module instances", async () => {
    vi.resetModules();
    const reloaded = await import("../src");

    for (const key of [
      "THEME_KEY",
      "INIT_OPTIONS_KEY",
      "UPDATE_OPTIONS_KEY",
      "LOADING_OPTIONS_KEY",
    ] as const) {
      expect(reloaded[key]).toBe(moduleExports[key]);
    }
  });
});
