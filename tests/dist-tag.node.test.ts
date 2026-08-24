/// <reference types="node" />

import { describe, expect, it } from "vitest";
import { getDistTag } from "../scripts/utils";

describe("getDistTag", () => {
  it("uses latest for stable versions", () => {
    expect(getDistTag("v1.2.3")).toBe("latest");
    expect(getDistTag("v1.2.3+build.1")).toBe("latest");
  });

  it("uses the textual prerelease identifier", () => {
    expect(getDistTag("v1.2.3-beta.0")).toBe("beta");
    expect(getDistTag("v1.2.3-next.0")).toBe("next");
    expect(getDistTag("v1.2.3-0.canary.1")).toBe("canary");
  });

  it("rejects prereleases without a usable dist tag", () => {
    expect(() => getDistTag("v1.2.3-0")).toThrow(
      "Cannot derive npm dist-tag from numeric prerelease",
    );
  });
});
