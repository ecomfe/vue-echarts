/// <reference types="node" />

import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

function run(version: string) {
  return spawnSync("pnpm", ["exec", "jiti", "scripts/dist-tag.ts", version], {
    encoding: "utf8",
  });
}

describe("dist tag script", () => {
  it("uses latest for stable versions", () => {
    expect(run("v1.2.3")).toMatchObject({ status: 0, stdout: "latest\n" });
    expect(run("v1.2.3+build.1")).toMatchObject({ status: 0, stdout: "latest\n" });
  });

  it("uses the textual prerelease identifier", () => {
    expect(run("v1.2.3-beta.0")).toMatchObject({ status: 0, stdout: "beta\n" });
    expect(run("v1.2.3-next.0")).toMatchObject({ status: 0, stdout: "next\n" });
    expect(run("v1.2.3-0.canary.1")).toMatchObject({ status: 0, stdout: "canary\n" });
  });

  it("rejects prereleases without a usable dist tag", () => {
    const result = run("v1.2.3-0");

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Cannot derive npm dist-tag from numeric prerelease");
  });
});
