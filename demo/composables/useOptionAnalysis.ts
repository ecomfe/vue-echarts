import { onBeforeUnmount, reactive, ref, watch } from "vue";
import type { MonacoMarkerLike, MonacoSeverity } from "../services/monaco";
import OptionWorker from "../workers/option.worker?worker";

export interface AnalyzerDiagnostic extends MonacoMarkerLike {
  severity: MonacoSeverity;
}

export interface AnalyzerIssueRange {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}

export type AnalyzerIssueKind = "syntax" | "runtime" | "format";

export interface AnalyzerIssue {
  kind: AnalyzerIssueKind;
  severity: MonacoSeverity;
  message: string;
  hint?: string;
  range?: AnalyzerIssueRange;
}

interface WorkerMessage {
  id: number;
  strategy: "expression" | "module";
  diagnostics: AnalyzerDiagnostic[];
  issues: AnalyzerIssue[];
  output?: string;
  option?: unknown;
  runtimeError?: string;
}

interface WorkerRequest {
  id: number;
  code: string;
}

type AnalyzerStatus = "idle" | "analyzing" | "ready" | "error";

export interface OptionAnalysisState {
  status: AnalyzerStatus;
  strategy: "expression" | "module";
  diagnostics: AnalyzerDiagnostic[];
  issues: AnalyzerIssue[];
  runtimeError: string | null;
  option: unknown;
  output: string | null;
  hasBlockingIssue: boolean;
}

const ANALYZE_DELAY = 120;

export function useOptionAnalysis(initialCode: string) {
  const isBrowser = typeof window !== "undefined";
  const worker = isBrowser ? new OptionWorker() : null;
  const code = ref(initialCode);
  const state = reactive<OptionAnalysisState>({
    status: "idle",
    strategy: "expression",
    diagnostics: [],
    issues: [],
    runtimeError: null,
    option: null,
    output: null,
    hasBlockingIssue: false,
  });

  let latestRequestId = 0;
  let timer: number | null = null;

  const postWork = (source: string) => {
    if (!worker || !isBrowser) {
      return;
    }
    if (timer !== null) {
      window.clearTimeout(timer);
    }
    const id = ++latestRequestId;
    state.status = "analyzing";
    state.diagnostics = [];
    state.issues = [];
    state.hasBlockingIssue = false;
    state.runtimeError = null;
    state.option = null;
    state.output = null;
    timer = window.setTimeout(() => {
      timer = null;
      const payload: WorkerRequest = { id, code: source };
      worker.postMessage(payload);
    }, ANALYZE_DELAY);
  };

  const handleMessage = (event: MessageEvent<WorkerMessage>) => {
    const { id, diagnostics, issues, option, output, runtimeError, strategy } = event.data;
    if (id !== latestRequestId) {
      return;
    }

    state.strategy = strategy;
    state.diagnostics = diagnostics;
    state.issues = issues;
    state.hasBlockingIssue = issues.some((item) => item.severity === "error");
    state.output = output ?? null;
    state.option = state.hasBlockingIssue ? null : (option ?? null);
    state.runtimeError = runtimeError ?? null;
    state.status = state.hasBlockingIssue ? "error" : "ready";
  };

  if (worker) {
    worker.addEventListener("message", handleMessage);
  }

  const stop = () => {
    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
    if (worker) {
      worker.removeEventListener("message", handleMessage);
      worker.terminate();
    }
  };

  onBeforeUnmount(stop);

  if (worker && isBrowser) {
    watch(
      code,
      (value) => {
        postWork(value);
      },
      { immediate: true },
    );
  }

  return {
    code,
    state,
    updateSource(next: string) {
      code.value = next;
    },
  };
}
