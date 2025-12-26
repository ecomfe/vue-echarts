import * as ts from "typescript";

class ExternalImportError extends Error {
  constructor(readonly request?: string) {
    super();
    this.name = "ExternalImportError";
  }
}

interface AnalyzeRequest {
  id: number;
  code: string;
}

type DiagnosticSeverity = "error" | "warning" | "info" | "hint";

interface AnalyzeDiagnostic {
  message: string;
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  severity: DiagnosticSeverity;
  code?: string;
  source?: string;
}

interface AnalyzeResponse {
  id: number;
  strategy: StrategyName;
  diagnostics: AnalyzeDiagnostic[];
  issues: AnalysisIssue[];
  output?: string;
  option?: unknown;
  runtimeError?: string | null;
}

type StrategyName = "expression" | "module";

type IssueKind = "syntax" | "runtime" | "format";

interface IssueRange {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}

interface AnalysisIssue {
  kind: IssueKind;
  severity: DiagnosticSeverity;
  message: string;
  hint?: string;
  range?: IssueRange;
}

interface StrategySpec {
  name: StrategyName;
  prefix: string;
  suffix: string;
  enabled: (code: string) => boolean;
}

const STRATEGIES: StrategySpec[] = [
  {
    name: "expression",
    prefix: "const __ve_option__ = (\n",
    suffix: "\n);\nexport default __ve_option__;\n",
    enabled(code) {
      return !/^\s*export\s+/m.test(code);
    },
  },
  {
    name: "module",
    prefix: "",
    suffix: "",
    enabled() {
      return true;
    },
  },
];

const compilerOptions: ts.CompilerOptions = {
  allowJs: true,
  esModuleInterop: true,
  forceConsistentCasingInFileNames: true,
  isolatedModules: true,
  lib: ["es2020", "dom"],
  module: ts.ModuleKind.CommonJS,
  moduleResolution: ts.ModuleResolutionKind.Node10,
  preserveConstEnums: true,
  skipLibCheck: true,
  strict: false,
  target: ts.ScriptTarget.ES2020,
};

const severityMap: Record<ts.DiagnosticCategory, DiagnosticSeverity> = {
  [ts.DiagnosticCategory.Warning]: "warning",
  [ts.DiagnosticCategory.Error]: "error",
  [ts.DiagnosticCategory.Message]: "info",
  [ts.DiagnosticCategory.Suggestion]: "hint",
};

function countLines(value: string) {
  const parts = value.split("\n");
  const lines = parts.length - 1;
  const lastLineLength = parts[parts.length - 1]?.length ?? 0;
  return { lines, lastLineLength };
}

function sanitizeDiagnosticMessage(message: string): string {
  return message
    .replace(/__ve_option__/g, "option")
    .replace(/module\.exports/g, "export")
    .replace(/__ve_option__\.([a-zA-Z_$][\w$]*)/g, "option.$1");
}

interface ConvertedDiagnostics {
  diagnostics: AnalyzeDiagnostic[];
  issues: AnalysisIssue[];
}

function convertDiagnostics(
  sourceFile: ts.SourceFile,
  diagnostics: readonly ts.Diagnostic[] | undefined,
  strategy: StrategySpec,
): ConvertedDiagnostics {
  if (!diagnostics?.length) {
    return { diagnostics: [], issues: [] };
  }

  const prefixInfo = countLines(strategy.prefix);
  const suffixInfo = countLines(strategy.suffix);
  const lastLineIndex = sourceFile.getLineAndCharacterOfPosition(sourceFile.text.length).line;
  const results: AnalyzeDiagnostic[] = [];
  const issues: AnalysisIssue[] = [];

  diagnostics.forEach((diagnostic) => {
    const file = diagnostic.file ?? sourceFile;
    if (typeof diagnostic.start !== "number") {
      const message = sanitizeDiagnosticMessage(
        ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
      );
      const mapped: AnalyzeDiagnostic = {
        message,
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 1,
        severity: severityMap[diagnostic.category] ?? "error",
        code: typeof diagnostic.code === "number" ? String(diagnostic.code) : undefined,
        source: diagnostic.source,
      };
      results.push(mapped);
      if (mapped.severity === "error") {
        issues.push({
          kind: "syntax",
          severity: "error",
          message,
          range: {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 1,
          },
        });
      }
      return;
    }

    const startOffset = diagnostic.start;
    const endOffset = startOffset + (diagnostic.length ?? 0);
    const start = file.getLineAndCharacterOfPosition(startOffset);
    const end = file.getLineAndCharacterOfPosition(endOffset);

    if (start.line < prefixInfo.lines) {
      return;
    }
    if (end.line > lastLineIndex - suffixInfo.lines) {
      return;
    }

    const toUserLine = (line: number) => line - prefixInfo.lines + 1;
    const toUserColumn = (line: number, column: number) => {
      if (line === prefixInfo.lines) {
        const offset = prefixInfo.lastLineLength;
        const adjusted = column - offset;
        return Math.max(1, adjusted + 1);
      }
      return column + 1;
    };

    const startLineNumber = toUserLine(start.line);
    const endLineNumber = toUserLine(end.line);

    if (startLineNumber < 1 || endLineNumber < startLineNumber) {
      return;
    }

    const startColumn = toUserColumn(start.line, start.character);
    const endColumn = toUserColumn(end.line, end.character);

    const message = sanitizeDiagnosticMessage(
      ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
    );
    const mapped: AnalyzeDiagnostic = {
      message,
      startLineNumber,
      startColumn,
      endLineNumber,
      endColumn,
      severity: severityMap[diagnostic.category] ?? "error",
      code: typeof diagnostic.code === "number" ? String(diagnostic.code) : undefined,
      source: diagnostic.source,
    };
    results.push(mapped);
    if (mapped.severity === "error") {
      issues.push({
        kind: "syntax",
        severity: "error",
        message,
        range: {
          startLineNumber,
          startColumn,
          endLineNumber,
          endColumn,
        },
      });
    }
  });

  return { diagnostics: results, issues };
}

async function evaluateModule(js: string) {
  try {
    const exports: Record<string, unknown> = {};
    const module = { exports } as { exports: Record<string, unknown> };
    const requireShim = (request?: string) => {
      throw new ExternalImportError(request);
    };

    const fn = new Function("exports", "module", "require", js) as (
      exports: Record<string, unknown>,
      module: { exports: Record<string, unknown> },
      require: () => unknown,
    ) => void;
    fn(exports, module, requireShim);

    const candidate = module.exports?.default ?? module.exports;
    if (candidate && typeof (candidate as Promise<unknown>).then === "function") {
      try {
        const value = await (candidate as Promise<unknown>);
        return { value } as const;
      } catch (error) {
        return { error } as const;
      }
    }
    return { value: candidate } as const;
  } catch (error) {
    return { error } as const;
  }
}

function cloneSerializable(value: unknown) {
  try {
    if (typeof structuredClone === "function") {
      return { result: structuredClone(value), error: null };
    }
  } catch (error) {
    return {
      result: null,
      error: error instanceof Error ? error.message : String(error ?? ""),
    } as const;
  }

  try {
    return {
      result: JSON.parse(JSON.stringify(value)) as unknown,
      error: null,
    } as const;
  } catch (error) {
    return {
      result: null,
      error: error instanceof Error ? error.message : String(error ?? ""),
    } as const;
  }
}

function buildFallback(sourceFile: ts.SourceFile): string {
  if (!sourceFile.statements.length) {
    return "";
  }
  const last = sourceFile.statements[sourceFile.statements.length - 1];
  if (!ts.isVariableStatement(last)) {
    return "";
  }
  const names: string[] = [];
  last.declarationList.declarations.forEach((declaration) => {
    if (ts.isIdentifier(declaration.name)) {
      names.push(declaration.name.text);
    }
  });
  if (!names.length) {
    return "";
  }
  const guards = names
    .map(
      (name) => `  if (typeof ${name} !== "undefined") {
    module.exports = { default: ${name} };
  }
`,
    )
    .join("\n");
  return `if (typeof module !== "undefined" && module && module.exports && Object.keys(module.exports).length === 0) {
${guards}}
`;
}

async function analyze(code: string): Promise<Omit<AnalyzeResponse, "id">> {
  const candidates = STRATEGIES.filter((strategy) => strategy.enabled(code)).map((strategy) => {
    const baseWrapped = `${strategy.prefix}${code}${strategy.suffix}`;
    const baseSourceFile = ts.createSourceFile(
      "ve-option.ts",
      baseWrapped,
      ts.ScriptTarget.ES2020,
      true,
      ts.ScriptKind.TSX,
    );

    const fallback = buildFallback(baseSourceFile);
    const wrapped = fallback ? `${baseWrapped}\n${fallback}` : baseWrapped;
    const sourceFile = fallback
      ? ts.createSourceFile(
          "ve-option.ts",
          wrapped,
          ts.ScriptTarget.ES2020,
          true,
          ts.ScriptKind.TSX,
        )
      : baseSourceFile;

    const result = ts.transpileModule(wrapped, {
      compilerOptions,
      reportDiagnostics: true,
      fileName: sourceFile.fileName,
    });

    const { diagnostics, issues: syntaxIssues } = convertDiagnostics(
      sourceFile,
      result.diagnostics,
      strategy,
    );

    const errorCount = syntaxIssues.length;

    return {
      strategy,
      wrapped,
      diagnostics,
      syntaxIssues,
      errorCount,
      output: result.outputText,
    };
  });

  if (!candidates.length) {
    return {
      strategy: "module",
      diagnostics: [],
      issues: [
        {
          kind: "runtime",
          severity: "error",
          message: "Option analyzer could not find a parsing strategy for this code.",
          hint: "Ensure the option is a valid JavaScript/TypeScript expression or module export.",
        },
      ],
      runtimeError: "Option analyzer could not find a parsing strategy for this code.",
    };
  }

  candidates.sort((a, b) => a.errorCount - b.errorCount);
  const winner = candidates[0];
  const issues: AnalysisIssue[] = [...winner.syntaxIssues];

  if (winner.errorCount > 0 || !winner.output) {
    return {
      strategy: winner.strategy.name,
      diagnostics: winner.diagnostics,
      issues,
    };
  }

  const { value, error } = await evaluateModule(winner.output);

  if (error) {
    const runtimeIssue = normalizeRuntimeIssue(error);
    issues.push(runtimeIssue);
    return {
      strategy: winner.strategy.name,
      diagnostics: winner.diagnostics,
      issues,
      output: winner.output,
      runtimeError: runtimeIssue.message,
    };
  }

  const validation = validateOptionExport(value);
  if (!validation.ok) {
    issues.push(validation.issue);
    return {
      strategy: winner.strategy.name,
      diagnostics: winner.diagnostics,
      issues,
      output: winner.output,
      runtimeError: validation.issue.message,
    };
  }

  const { result: clonedValue, error: cloneError } = cloneSerializable(validation.value);
  if (cloneError) {
    const serializationIssue = normalizeSerializationIssue(cloneError);
    issues.push(serializationIssue);
    return {
      strategy: winner.strategy.name,
      diagnostics: winner.diagnostics,
      issues,
      output: winner.output,
      runtimeError: serializationIssue.message,
    };
  }

  return {
    strategy: winner.strategy.name,
    diagnostics: winner.diagnostics,
    issues,
    output: winner.output,
    option: clonedValue,
    runtimeError: null,
  };
}

self.onmessage = async (event: MessageEvent<AnalyzeRequest>) => {
  const { id, code } = event.data;
  const response = await analyze(code);
  (self as unknown as Worker).postMessage({
    id,
    ...response,
  } satisfies AnalyzeResponse);
};

function normalizeRuntimeIssue(error: unknown): AnalysisIssue {
  if (error instanceof ExternalImportError) {
    const source = error.request;
    return {
      kind: "runtime",
      severity: "error",
      message: source
        ? `Imports from "${source}" can't be resolved in this editor.`
        : "Imports that reference other files can't be resolved in this editor.",
      hint: "Inline the referenced values directly inside the option snippet before generating imports.",
    };
  }

  const message = toUserFacingMessage(error);
  if (/Dynamic require/i.test(message)) {
    return {
      kind: "runtime",
      severity: "error",
      message: "Imports that reference other files can't be resolved in this editor.",
      hint: "Inline the referenced values directly inside the option snippet before generating imports.",
    };
  }
  return {
    kind: "runtime",
    severity: "error",
    message,
  };
}

function normalizeSerializationIssue(detail: string): AnalysisIssue {
  const message =
    "The exported option includes values that cannot be serialized (e.g. functions or DOM nodes).";
  return {
    kind: "format",
    severity: "error",
    message,
    hint: detail,
  };
}

function toUserFacingMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "The option module threw an unknown error.";
}

function validateOptionExport(
  value: unknown,
): { ok: true; value: Record<string, unknown> } | { ok: false; issue: AnalysisIssue } {
  if (value === null || value === undefined) {
    return {
      ok: false,
      issue: createMissingExportIssue(),
    };
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    return {
      ok: false,
      issue: createInvalidExportIssue(value),
    };
  }

  return {
    ok: true,
    value: value as Record<string, unknown>,
  };
}

function createMissingExportIssue(): AnalysisIssue {
  return {
    kind: "format",
    severity: "error",
    message: "No ECharts option export was found. Export your option object as the default value.",
    hint: "Use `export default { ... }` or assign the option to the last declared variable.",
  };
}

function createInvalidExportIssue(value: unknown): AnalysisIssue {
  const type = typeof value;
  const base: AnalysisIssue = {
    kind: "format",
    severity: "error",
    message: "The default export must be an ECharts option object.",
  };

  if (type === "function") {
    return {
      ...base,
      hint: "Call the function and export its return value instead of the function itself.",
    };
  }

  if (type !== "object") {
    return {
      ...base,
      hint: `Received a ${type}. Export an object with fields such as series or xAxis instead.`,
    };
  }

  if (Array.isArray(value)) {
    return {
      ...base,
      hint: "Arrays are not valid options. Wrap your data in an object with option properties.",
    };
  }

  return base;
}

export { analyze };
export type { AnalysisIssue, IssueKind, IssueRange };
