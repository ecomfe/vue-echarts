import { defineComponent, nextTick } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useOptionAnalysis } from "../demo/composables/useOptionAnalysis";
import { render } from "./helpers/testing";

import type { AnalyzeRequest, AnalyzeResponse } from "../demo/workers/option.types";

const worker = vi.hoisted(() => ({
  target: null as EventTarget | null,
  postMessage: vi.fn<(request: AnalyzeRequest) => void>(),
  terminate: vi.fn(),
}));

vi.mock("../demo/workers/option.worker?worker", () => ({
  default: class extends EventTarget {
    constructor() {
      super();
      worker.target = this;
    }

    postMessage(request: AnalyzeRequest) {
      worker.postMessage(request);
    }

    terminate() {
      worker.terminate();
    }
  },
}));

beforeEach(() => {
  worker.target = null;
  worker.postMessage.mockReset();
  worker.terminate.mockReset();
});

afterEach(() => vi.useRealTimers());

async function mountAnalysis() {
  let analysis!: ReturnType<typeof useOptionAnalysis>;
  const screen = await render(
    defineComponent(() => {
      analysis = useOptionAnalysis("first");
      return () => null;
    }),
  );
  return { analysis, screen };
}

function reply(request: AnalyzeRequest, dependencies: string[]): void {
  worker.target?.dispatchEvent(
    new MessageEvent("message", {
      data: {
        id: request.id,
        strategy: "expression",
        diagnostics: [],
        issues: [],
        dependencies,
      } satisfies AnalyzeResponse,
    }),
  );
}

describe("useOptionAnalysis", () => {
  it("times out a request and recovers on the next edit", async () => {
    vi.useFakeTimers();
    const { analysis, screen } = await mountAnalysis();
    await vi.advanceTimersByTimeAsync(120);
    const oldWorker = worker.target;

    await vi.advanceTimersByTimeAsync(5000);
    expect(analysis.state.status).toBe("error");
    expect(analysis.state.issues).toEqual([
      { kind: "runtime", severity: "error", message: expect.stringContaining("timed out") },
    ]);
    expect(worker.terminate).toHaveBeenCalledOnce();

    analysis.code.value = "recovered";
    await nextTick();
    await vi.advanceTimersByTimeAsync(120);
    expect(worker.target).not.toBe(oldWorker);
    reply(worker.postMessage.mock.calls[1][0], ["TitleComponent"]);
    await vi.advanceTimersByTimeAsync(5000);
    expect(analysis.state.status).toBe("ready");
    expect(analysis.state.dependencies).toEqual(["TitleComponent"]);
    expect(analysis.state.issues).toEqual([]);
    await screen.unmount();
  });

  it("replaces a busy worker and ignores its late messages and errors", async () => {
    vi.useFakeTimers();
    const { analysis, screen } = await mountAnalysis();
    await vi.advanceTimersByTimeAsync(120);
    const oldWorker = worker.target;
    const first = worker.postMessage.mock.calls[0][0];
    analysis.code.value = "second";
    await nextTick();
    await vi.advanceTimersByTimeAsync(120);
    expect(worker.terminate).toHaveBeenCalledOnce();
    expect(worker.target).not.toBe(oldWorker);
    oldWorker?.dispatchEvent(new MessageEvent("message", { data: { id: first.id } }));
    oldWorker?.dispatchEvent(new Event("error"));
    expect(analysis.state.status).toBe("analyzing");
    reply(worker.postMessage.mock.calls[1][0], ["BarChart"]);
    expect(analysis.state.dependencies).toEqual(["BarChart"]);
    await screen.unmount();
  });

  it.each(["error", "messageerror"])("recovers from a worker %s", async (type) => {
    vi.useFakeTimers();
    const { analysis, screen } = await mountAnalysis();
    await vi.advanceTimersByTimeAsync(120);
    worker.target?.dispatchEvent(new Event(type, { cancelable: true }));
    expect(analysis.state.status).toBe("error");
    expect(analysis.state.issues).toEqual([
      expect.objectContaining({ kind: "runtime", severity: "error" }),
    ]);
    expect(worker.terminate).toHaveBeenCalledOnce();
    analysis.code.value = "second";
    await nextTick();
    await vi.advanceTimersByTimeAsync(120);
    reply(worker.postMessage.mock.calls[1][0], []);
    expect(analysis.state.status).toBe("ready");
    await screen.unmount();
  });

  it("reports synchronous submission failures and cancels work on unmount", async () => {
    vi.useFakeTimers();
    worker.postMessage.mockImplementationOnce(() => {
      throw new Error("cannot post");
    });
    const { analysis, screen } = await mountAnalysis();
    await vi.advanceTimersByTimeAsync(120);
    expect(analysis.state.status).toBe("error");
    expect(worker.terminate).toHaveBeenCalledOnce();
    analysis.code.value = "second";
    await nextTick();
    await screen.unmount();
    await vi.advanceTimersByTimeAsync(6000);
    expect(worker.postMessage).toHaveBeenCalledOnce();
  });

  it("reuses an idle worker and clears its deadline on unmount", async () => {
    vi.useFakeTimers();
    const { analysis, screen } = await mountAnalysis();
    await vi.advanceTimersByTimeAsync(120);
    const initialWorker = worker.target;
    reply(worker.postMessage.mock.calls[0][0], []);
    analysis.code.value = "second";
    await nextTick();
    await vi.advanceTimersByTimeAsync(120);
    expect(worker.target).toBe(initialWorker);
    await screen.unmount();
    await vi.advanceTimersByTimeAsync(5000);
    expect(analysis.state.status).toBe("analyzing");
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it("invalidates stale results as soon as source changes", async () => {
    const { analysis, screen } = await mountAnalysis();

    await vi.waitFor(() => expect(worker.postMessage).toHaveBeenCalledTimes(1));
    const first = worker.postMessage.mock.calls[0][0];

    analysis.code.value = "second";
    await nextTick();
    reply(first, ["LineChart"]);

    expect(analysis.state.status).toBe("analyzing");
    expect(analysis.state.dependencies).toBeNull();

    await vi.waitFor(() => expect(worker.postMessage).toHaveBeenCalledTimes(2));
    const second = worker.postMessage.mock.calls[1][0];
    reply(second, ["BarChart"]);
    expect(analysis.state.status).toBe("ready");
    expect(analysis.state.dependencies).toEqual(["BarChart"]);

    analysis.code.value = "third";
    await nextTick();
    expect(analysis.state.status).toBe("analyzing");
    expect(analysis.state.dependencies).toBeNull();

    await screen.unmount();
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
});
