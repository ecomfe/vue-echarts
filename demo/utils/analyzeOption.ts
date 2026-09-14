import * as ts from "typescript";
import { getDependenciesFromOption } from "./codegen";
import type {
  AnalyzeResult,
  AnalyzeDiagnostic,
  AnalysisIssue,
  DiagnosticSeverity,
  IssueRange,
  StrategyName,
} from "../workers/option.types";

class ExternalImportError extends Error {
  constructor(readonly request?: string) {
    super();
    this.name = "ExternalImportError";
  }
}

interface CodeWrapper {
  prefix: string;
  suffix: string;
}

const WRAPPERS: Record<StrategyName, CodeWrapper> = {
  expression: {
    prefix: "const __ve_option__ = (\n",
    suffix: "\n);\nexport default __ve_option__;\n",
  },
  module: {
    prefix: "",
    suffix: "",
  },
};

const compilerOptions: ts.CompilerOptions = {
  allowJs: true,
  esModuleInterop: true,
  forceConsistentCasingInFileNames: true,
  isolatedModules: true,
  lib: ["es2020", "dom"],
  module: ts.ModuleKind.CommonJS,
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

function sanitizeDiagnosticMessage(message: string): string {
  return message.replace(/__ve_option__/g, "option").replace(/module\.exports/g, "export");
}

interface ConvertedDiagnostics {
  diagnostics: AnalyzeDiagnostic[];
  issues: AnalysisIssue[];
}

function convertDiagnostics(
  sourceFile: ts.SourceFile,
  diagnostics: readonly ts.Diagnostic[] | undefined,
  wrapper: CodeWrapper,
): ConvertedDiagnostics {
  if (!diagnostics?.length) {
    return { diagnostics: [], issues: [] };
  }

  const prefixLines = wrapper.prefix.split("\n").length - 1;
  const suffixLines = wrapper.suffix.split("\n").length - 1;
  const lastLineIndex = sourceFile.getLineAndCharacterOfPosition(sourceFile.text.length).line;
  const results: AnalyzeDiagnostic[] = [];
  const issues: AnalysisIssue[] = [];

  diagnostics.forEach((diagnostic) => {
    let range: IssueRange = {
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: 1,
      endColumn: 1,
    };

    if (typeof diagnostic.start === "number") {
      const file = diagnostic.file ?? sourceFile;
      const startOffset = diagnostic.start;
      const endOffset = startOffset + (diagnostic.length ?? 0);
      const start = file.getLineAndCharacterOfPosition(startOffset);
      const end = file.getLineAndCharacterOfPosition(endOffset);

      if (start.line < prefixLines || end.line > lastLineIndex - suffixLines) {
        return;
      }

      // Wrappers only insert whole lines, so user columns stay unchanged.
      range = {
        startLineNumber: start.line - prefixLines + 1,
        startColumn: start.character + 1,
        endLineNumber: end.line - prefixLines + 1,
        endColumn: end.character + 1,
      };
    }

    const message = sanitizeDiagnosticMessage(
      ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
    );
    const mapped: AnalyzeDiagnostic = {
      message,
      ...range,
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
        range,
      });
    }
  });

  return { diagnostics: results, issues };
}

async function evaluateModule(js: string) {
  const exports: Record<string, unknown> = {};
  const module: { exports: unknown } = { exports };
  const requireShim = (request?: string) => {
    throw new ExternalImportError(request);
  };

  const fn = new Function("exports", "module", "require", js) as (
    exports: Record<string, unknown>,
    module: { exports: unknown },
    require: (request?: string) => never,
  ) => void;
  fn(exports, module, requireShim);

  const exported = module.exports;
  if (
    exported !== null &&
    (typeof exported === "object" || typeof exported === "function") &&
    Object.hasOwn(exported, "default")
  ) {
    return (exported as { default: unknown }).default;
  }
  if (exported !== exports || (!exports.__esModule && Object.keys(exports).length > 0)) {
    return exported;
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

function compileOption(code: string, strategy: StrategyName): AnalyzeResult & { output: string } {
  const wrapper = WRAPPERS[strategy];
  const baseWrapped = `${wrapper.prefix}${code}${wrapper.suffix}`;
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
    ? ts.createSourceFile("ve-option.ts", wrapped, ts.ScriptTarget.ES2020, true, ts.ScriptKind.TSX)
    : baseSourceFile;
  const result = ts.transpileModule(wrapped, {
    compilerOptions,
    reportDiagnostics: true,
    fileName: sourceFile.fileName,
  });
  return {
    strategy,
    ...convertDiagnostics(sourceFile, result.diagnostics, wrapper),
    output: result.outputText,
  };
}

export async function analyzeOption(code: string): Promise<AnalyzeResult> {
  let compiled = compileOption(code, /^\s*export\s+/m.test(code) ? "module" : "expression");
  if (compiled.strategy === "expression" && compiled.issues.length > 0) {
    const module = compileOption(code, "module");
    if (module.issues.length < compiled.issues.length) {
      compiled = module;
    }
  }
  const { output, ...result } = compiled;
  if (result.issues.length > 0 || !output) {
    return result;
  }

  try {
    const value = await evaluateModule(output);
    const issue = getExportIssue(value);
    if (issue) {
      result.issues.push(issue);
    } else {
      result.dependencies = getDependenciesFromOption(value);
    }
  } catch (error) {
    result.issues.push(normalizeRuntimeIssue(error));
  }
  return result;
}

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

function toUserFacingMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "The option module threw an unknown error.";
}

function getExportIssue(value: unknown): AnalysisIssue | undefined {
  if (value === null || value === undefined) {
    return {
      kind: "format",
      severity: "error",
      message:
        "No ECharts option export was found. Export your option object as the default value.",
      hint: "Use `export default { ... }` or assign the option to the last declared variable.",
    };
  }

  const type = typeof value;
  if (type === "object" && !Array.isArray(value)) {
    return;
  }

  let hint: string;
  if (type === "function") {
    hint = "Call the function and export its return value instead of the function itself.";
  } else if (type === "object") {
    hint = "Arrays are not valid options. Wrap your data in an object with option properties.";
  } else {
    hint = `Received a ${type}. Export an object with fields such as series or xAxis instead.`;
  }
  return {
    kind: "format",
    severity: "error",
    message: "The default export must be an ECharts option object.",
    hint,
  };
}
