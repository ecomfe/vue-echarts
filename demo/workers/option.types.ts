export interface AnalyzeRequest {
  id: number;
  code: string;
}

export type DiagnosticSeverity = "error" | "warning" | "info" | "hint";

export interface AnalyzeDiagnostic extends IssueRange {
  message: string;
  severity: DiagnosticSeverity;
  code?: string;
  source?: string;
}

export interface AnalyzeResult {
  strategy: StrategyName;
  diagnostics: AnalyzeDiagnostic[];
  issues: AnalysisIssue[];
  dependencies?: string[];
}

export interface AnalyzeResponse extends AnalyzeResult {
  id: number;
}

export type StrategyName = "expression" | "module";

export type IssueKind = "syntax" | "runtime" | "format";

export interface IssueRange {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}

export interface AnalysisIssue {
  kind: IssueKind;
  severity: DiagnosticSeverity;
  message: string;
  hint?: string;
  range?: IssueRange;
}
