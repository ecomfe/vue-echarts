import { version as vueVersion } from "vue";
import { version as echartsVersion } from "echarts/core";
import { expect, it } from "vitest";

it("runs against the exact minimum supported runtimes", () => {
  expect(vueVersion).toBe("3.3.0");
  expect(echartsVersion).toBe("6.0.0");
});
