import { describe, expect, it } from "vitest";
import { analyzeOption as analyze } from "../demo/utils/analyzeOption";

describe("option analysis", () => {
  it("reports syntax issues without exposing internals", async () => {
    const result = await analyze("const option = { foo: 'bar';\nexport default option;");

    expect(result.issues).not.toHaveLength(0);
    const issue = result.issues[0];
    expect(issue.kind).toBe("syntax");
    expect(issue.severity).toBe("error");
    expect(issue.message).not.toContain("__ve_option__");
    expect(issue.message).not.toContain("module.exports");
  });

  it.each([
    ["({ series: [{ type: 'line' }] })", "expression"],
    ["const option = { series: [{ type: 'line' }] };", "module"],
    ["export default { series: [{ type: 'line' }] };", "module"],
  ])("selects a valid strategy for %s", async (code, strategy) => {
    const result = await analyze(code);
    expect(result.strategy).toBe(strategy);
    expect(result.issues).toEqual([]);
    expect(result.dependencies).toEqual(["LineChart"]);
  });

  it("evaluates the selected strategy only once", async () => {
    const result = await analyze(
      "(() => { globalThis.__ve_evaluations = (globalThis.__ve_evaluations ?? 0) + 1; return { series: [{ type: 'line' }] }; })()",
    );
    try {
      expect(result.issues).toEqual([]);
      expect(result.dependencies).toEqual(["LineChart"]);
      expect((globalThis as { __ve_evaluations?: number }).__ve_evaluations).toBe(1);
    } finally {
      delete (globalThis as { __ve_evaluations?: number }).__ve_evaluations;
    }
  });

  it.each([
    ["({\n  series: ;\n})", "expression"],
    ["const option = {\n  series: ;\n};", "module"],
  ])("preserves user diagnostic positions for %s", async (code, strategy) => {
    const result = await analyze(code);
    const range = { startLineNumber: 2, startColumn: 11, endLineNumber: 2, endColumn: 12 };
    expect(result.strategy).toBe(strategy);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({ ...range, severity: "error", code: "1109" }),
    ]);
    expect(result.issues).toEqual([
      { kind: "syntax", severity: "error", message: result.diagnostics[0].message, range },
    ]);
    expect(result.dependencies).toBeUndefined();
  });

  it.each([
    ["const option = { series: [{ type: 'line' }] }, unused = undefined;", ["LineChart"]],
    [
      "module.exports = { title: {} }; const option = { series: [{ type: 'bar' }] };",
      ["TitleComponent"],
    ],
  ])(
    "uses the last defined variable only when no export exists: %s",
    async (code, dependencies) => {
      const result = await analyze(code);
      expect(result.issues).toEqual([]);
      expect(result.dependencies).toEqual(dependencies);
    },
  );

  it.each([
    ["42", "Received a number. Export an object with fields such as series or xAxis instead."],
    ["[]", "Arrays are not valid options. Wrap your data in an object with option properties."],
  ])("preserves invalid export guidance for %s", async (value, hint) => {
    const result = await analyze(`export default ${value};`);
    expect(result.issues).toEqual([
      {
        kind: "format",
        severity: "error",
        message: "The default export must be an ECharts option object.",
        hint,
      },
    ]);
    expect(result.dependencies).toBeUndefined();
  });

  it("captures runtime failures with user-friendly messages", async () => {
    const result = await analyze("export default (() => { throw new Error('boom'); })();");

    const runtimeIssue = result.issues.find((item) => item.kind === "runtime");
    expect(runtimeIssue).toMatchObject({ message: expect.stringContaining("boom") });
    expect(result.dependencies).toBeUndefined();
  });

  it("awaits asynchronous option exports", async () => {
    const result = await analyze("export default Promise.resolve({ title: { text: 'async' } });");

    expect(result.issues).toEqual([]);
    expect(result.dependencies).toEqual(["TitleComponent"]);
  });

  it("reports rejected asynchronous exports as runtime failures", async () => {
    const result = await analyze("export default Promise.reject(new Error('async failure'));");

    expect(result.issues).toEqual([
      { kind: "runtime", severity: "error", message: "async failure" },
    ]);
    expect(result.dependencies).toBeUndefined();
  });

  it("returns the same small dependency summary regardless of series data size", async () => {
    const results = await Promise.all(
      [10, 100000].map((size) =>
        analyze(
          `({ series: [{ type: 'line', data: Array.from({ length: ${size} }, (_, i) => i) }] })`,
        ),
      ),
    );
    expect(results[0]).toEqual({
      strategy: "expression",
      diagnostics: [],
      issues: [],
      dependencies: ["LineChart"],
    });
    expect(results[1]).toEqual(results[0]);
  });

  it("accepts option callbacks without invoking or serializing them", async () => {
    const result = await analyze(`export default {
      tooltip: { formatter() { throw new Error('do not invoke formatter'); } },
      series: [{ type: 'custom', renderItem() { throw new Error('do not invoke renderItem'); } }]
    };`);

    expect(result.issues).toEqual([]);
    expect(result.dependencies).toEqual(["TooltipComponent", "CustomChart"]);
  });

  it.each([
    "export default null;",
    "export default undefined;",
    "export default Promise.resolve(undefined);",
    "export const option = { series: [{ type: 'bar' }] };",
    "void 0;",
  ])("rejects a missing option export: %s", async (code) => {
    const result = await analyze(code);
    expect(result.issues).toEqual([
      expect.objectContaining({
        kind: "format",
        message: expect.stringContaining("No ECharts option export was found"),
      }),
    ]);
    expect(result.dependencies).toBeUndefined();
  });

  it.each(["({})", "export default {};", "module.exports = {};"])(
    "accepts an explicitly exported empty option: %s",
    async (code) => {
      const result = await analyze(code);
      expect(result.issues).toEqual([]);
      expect(result.dependencies).toEqual([]);
    },
  );

  it("preserves CommonJS option exports", async () => {
    const result = await analyze("exports.title = {}; exports.series = [{ type: 'bar' }];");
    expect(result.issues).toEqual([]);
    expect(result.dependencies).toEqual(["TitleComponent", "BarChart"]);
  });

  it("captures errors from dependency getters and falsy thrown values", async () => {
    const getter = await analyze("({ get series() { throw new Error('cannot read series'); } })");
    expect(getter.issues).toEqual([
      { kind: "runtime", severity: "error", message: "cannot read series" },
    ]);
    const thrown = await analyze("(() => { throw null; })()");
    expect(thrown.issues).toEqual([
      { kind: "runtime", severity: "error", message: "The option module threw an unknown error." },
    ]);
  });

  it("guides users when external imports cannot be resolved", async () => {
    const result = await analyze("import data from './data';\nexport default { data };");

    const runtimeIssue = result.issues.find((item) => item.kind === "runtime");
    expect(runtimeIssue).toMatchObject({
      message: expect.stringContaining('Imports from "./data" can\'t be resolved'),
      hint: expect.stringContaining("Inline the referenced values"),
    });
    expect(result.dependencies).toBeUndefined();
  });

  it("reports when the default export is a function instead of an option object", async () => {
    const result = await analyze("export default function getData() {}");

    const formatIssue = result.issues.find((item) => item.kind === "format");
    expect(formatIssue).toMatchObject({
      message: "The default export must be an ECharts option object.",
      hint: expect.stringContaining("Call the function and export its return value"),
    });
    expect(result.dependencies).toBeUndefined();
  });
});
