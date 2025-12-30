import { describe, it, expect } from "vitest";

describe("style entry (node)", () => {
  it("does nothing when not in a browser environment", async () => {
    await expect(import("../src/style")).resolves.toBeDefined();
  });
});
