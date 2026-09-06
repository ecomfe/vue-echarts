import { onBeforeUnmount, reactive, ref, watch } from "vue";
import OptionWorker from "../workers/option.worker?worker";
import type {
  AnalyzeDiagnostic,
  AnalyzeRequest,
  AnalyzeResponse,
  AnalysisIssue,
  StrategyName,
} from "../workers/option.types";

type AnalyzerStatus = "idle" | "analyzing" | "ready" | "error";

export interface OptionAnalysisState {
  status: AnalyzerStatus;
  strategy: StrategyName;
  diagnostics: AnalyzeDiagnostic[];
  issues: AnalysisIssue[];
  runtimeError: string | null;
  option: unknown;
  output: string | null;
  hasBlockingIssue: boolean;
}

const ANALYZE_DELAY = 120;

export function useOptionAnalysis(initialCode: string) {
  const worker = typeof window !== "undefined" ? new OptionWorker() : null;
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
    if (!worker) {
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
      const payload: AnalyzeRequest = { id, code: source };
      worker.postMessage(payload);
    }, ANALYZE_DELAY);
  };

  const handleMessage = (event: MessageEvent<AnalyzeResponse>) => {
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

  if (worker) {
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
