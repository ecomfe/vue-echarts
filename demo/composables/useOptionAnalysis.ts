import { onBeforeUnmount, reactive, ref, watch } from "vue";
import OptionWorker from "../workers/option.worker?worker";
import type {
  AnalyzeDiagnostic,
  AnalyzeRequest,
  AnalyzeResponse,
  AnalysisIssue,
} from "../workers/option.types";

type AnalyzerStatus = "idle" | "analyzing" | "ready" | "error";

export interface OptionAnalysisState {
  status: AnalyzerStatus;
  diagnostics: AnalyzeDiagnostic[];
  issues: AnalysisIssue[];
  dependencies: string[] | null;
}

const ANALYZE_DELAY = 120;
const ANALYZE_TIMEOUT = 5000;

export function useOptionAnalysis(initialCode: string) {
  let worker: Worker | null = null;
  const code = ref(initialCode);
  const state = reactive<OptionAnalysisState>({
    status: "idle",
    diagnostics: [],
    issues: [],
    dependencies: null,
  });

  let latestRequestId = 0;
  let timer: number | null = null;
  let timeout: number | null = null;
  let pendingRequestId: number | null = null;

  function finishRequest(): void {
    if (timeout !== null) {
      window.clearTimeout(timeout);
      timeout = null;
    }
    pendingRequestId = null;
  }

  function stopWorker(): void {
    finishRequest();
    if (worker) {
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleError);
      worker.removeEventListener("messageerror", handleError);
      worker.terminate();
      worker = null;
    }
  }

  function fail(message: string): void {
    const id = pendingRequestId;
    stopWorker();
    if (id !== latestRequestId) {
      return;
    }
    state.status = "error";
    state.issues = [{ kind: "runtime", severity: "error", message }];
    state.dependencies = null;
  }

  function handleError(event: Event): void {
    event.preventDefault();
    fail("The option analyzer stopped unexpectedly. Edit your code to try again.");
  }

  const postWork = (source: string) => {
    if (timer !== null) {
      window.clearTimeout(timer);
    }
    const id = ++latestRequestId;
    state.status = "analyzing";
    state.diagnostics = [];
    state.issues = [];
    state.dependencies = null;
    timer = window.setTimeout(() => {
      timer = null;
      const payload: AnalyzeRequest = { id, code: source };
      // Only interrupt work when a newer debounced request is ready. Reuse an idle
      // worker, but discard a busy one so loops and pending promises cannot pile up.
      if (pendingRequestId !== null) {
        stopWorker();
      }
      pendingRequestId = id;
      try {
        if (!worker) {
          worker = new OptionWorker();
          worker.addEventListener("message", handleMessage);
          worker.addEventListener("error", handleError);
          worker.addEventListener("messageerror", handleError);
        }
        // This timer must live on the main thread: evaluated code may block the worker.
        timeout = window.setTimeout(() => {
          fail(
            "Option analysis timed out. Check for loops or unfinished promises, then edit your code to try again.",
          );
        }, ANALYZE_TIMEOUT);
        worker.postMessage(payload);
      } catch {
        fail("The option analyzer could not start. Edit your code to try again.");
      }
    }, ANALYZE_DELAY);
  };

  function handleMessage(event: MessageEvent<AnalyzeResponse>): void {
    const { id, diagnostics, issues, dependencies } = event.data;
    if (id !== pendingRequestId) {
      return;
    }
    finishRequest();
    if (id !== latestRequestId) {
      return;
    }

    const hasError = issues.some((item) => item.severity === "error");
    state.diagnostics = diagnostics;
    state.issues = issues;
    state.dependencies = hasError ? null : (dependencies ?? null);
    state.status = hasError ? "error" : "ready";
  }

  onBeforeUnmount(() => {
    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
    stopWorker();
  });

  if (typeof window !== "undefined") {
    watch(code, postWork, { immediate: true });
  }

  return {
    code,
    state,
  };
}
