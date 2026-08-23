import { describe, it, expect } from "vitest";

describe("style entry (node)", () => {
  it("does nothing when not in a browser environment", async () => {
    const { ensureStyles } = await import("../src/style");

    expect(ensureStyles()).toBeUndefined();
  });
});
