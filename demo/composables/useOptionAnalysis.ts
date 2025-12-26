import { onBeforeUnmount, reactive, ref, watch } from "vue";
import type { Ref } from "vue";
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

export interface UseOptionAnalysisResult {
  code: Ref<string>;
  state: OptionAnalysisState;
  updateSource(code: string): void;
  dispose(): void;
}

const ANALYZE_DELAY = 120;

export function useOptionAnalysis(initialCode: string): UseOptionAnalysisResult {
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

  let requestId = 0;
  let latestRequest = 0;
  let timer: number | null = null;

  const postWork = (source: string) => {
    if (!worker || !isBrowser) {
      return;
    }
    if (timer !== null) {
      window.clearTimeout(timer);
    }
    timer = window.setTimeout(() => {
      state.status = "analyzing";
      state.issues = [];
      state.hasBlockingIssue = false;
      state.runtimeError = null;
      requestId += 1;
      latestRequest = requestId;
      const payload: WorkerRequest = { id: requestId, code: source };
      worker.postMessage(payload);
    }, ANALYZE_DELAY);
  };

  const handleMessage = (event: MessageEvent<WorkerMessage>) => {
    const { id, diagnostics, issues, option, output, runtimeError, strategy } = event.data;
    if (id !== latestRequest) {
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
    updateSource(next) {
      code.value = next;
    },
    dispose: stop,
  };
}
