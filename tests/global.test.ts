import { describe, it, expect } from "vitest";

import entry, * as moduleExports from "../src/index";
import globalEntry from "../src/global";

import ECharts from "../src/ECharts";

describe("entry points", () => {
  it("re-export ECharts correctly from src/index.ts", () => {
    expect(entry).toBe(ECharts);
    expect(moduleExports.default).toBe(ECharts);
  });

  it("global entry merges default and named exports", () => {
    expect(globalEntry.default).toBe(ECharts);
    expect(Object.keys(globalEntry)).toEqual(expect.arrayContaining(Object.keys(moduleExports)));
  });
});
