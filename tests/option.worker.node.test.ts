import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

type AnalyzeResult = {
  issues: Array<{
    kind: string;
    severity: string;
    message: string;
    hint?: string;
  }>;
  option?: unknown;
};
type AnalyzeFn = (code: string) => Promise<AnalyzeResult>;

describe("option worker issues", () => {
  let originalSelf: unknown;
  let analyze: AnalyzeFn;

  beforeAll(async () => {
    originalSelf = (globalThis as Record<string, unknown>).self;
    const workerStub = {
      postMessage: vi.fn(),
    } as unknown as Worker;
    (globalThis as Record<string, unknown>).self = workerStub;

    const module = await import("../demo/workers/option.worker");
    analyze = module.analyze;
  });

  afterAll(() => {
    if (typeof originalSelf === "undefined") {
      delete (globalThis as Record<string, unknown>).self;
    } else {
      (globalThis as Record<string, unknown>).self = originalSelf;
    }
  });

  it("reports syntax issues without exposing internals", async () => {
    const result = await analyze("const option = { foo: 'bar';\nexport default option;");

    expect(result.issues).not.toHaveLength(0);
    const issue = result.issues[0];
    expect(issue.kind).toBe("syntax");
    expect(issue.severity).toBe("error");
    expect(issue.message).not.toContain("__ve_option__");
    expect(issue.message).not.toContain("module.exports");
  });

  it("captures runtime failures with user-friendly messages", async () => {
    const result = await analyze("export default (() => { throw new Error('boom'); })();");

    const runtimeIssue = result.issues.find((item) => item.kind === "runtime");
    expect(runtimeIssue).toBeDefined();
    expect(runtimeIssue?.message ?? "").toContain("boom");
    expect(result.option).toBeUndefined();
  });

  it("flags non-serializable option exports", async () => {
    const result = await analyze("export default { label: () => 'hi' };");

    const formatIssue = result.issues.find((item) => item.kind === "format");
    expect(formatIssue).toBeDefined();
    expect(formatIssue?.message ?? "").toContain("cannot be serialized");
    expect(result.option).toBeUndefined();
  });

  it("guides users when external imports cannot be resolved", async () => {
    const result = await analyze("import data from './data';\nexport default { data };");

    const runtimeIssue = result.issues.find((item) => item.kind === "runtime");
    expect(runtimeIssue).toBeDefined();
    expect(runtimeIssue?.message ?? "").toContain('Imports from "./data" can\'t be resolved');
    expect(runtimeIssue?.hint ?? "").toContain("Inline the referenced values");
    expect(result.option).toBeUndefined();
  });

  it("reports when the default export is a function instead of an option object", async () => {
    const result = await analyze("export default function getData() {}");

    const formatIssue = result.issues.find((item) => item.kind === "format");
    expect(formatIssue).toBeDefined();
    expect(formatIssue?.message).toBe("The default export must be an ECharts option object.");
    expect(formatIssue?.hint ?? "").toContain("Call the function and export its return value");
    expect(result.option).toBeUndefined();
  });
});
