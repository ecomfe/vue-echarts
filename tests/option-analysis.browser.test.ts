import { defineComponent, nextTick } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useOptionAnalysis } from "../demo/composables/useOptionAnalysis";
import { render } from "./helpers/testing";

import type { AnalyzeRequest } from "../demo/workers/option.types";

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

function reply(request: AnalyzeRequest, option: unknown): void {
  worker.target?.dispatchEvent(
    new MessageEvent("message", {
      data: {
        id: request.id,
        strategy: "expression",
        diagnostics: [],
        issues: [],
        option,
        output: request.code,
      },
    }),
  );
}

describe("useOptionAnalysis", () => {
  it("invalidates stale results as soon as source changes", async () => {
    let analysis!: ReturnType<typeof useOptionAnalysis>;
    const screen = render(
      defineComponent(() => {
        analysis = useOptionAnalysis("first");
        return () => null;
      }),
    );

    await vi.waitFor(() => expect(worker.postMessage).toHaveBeenCalledTimes(1));
    const first = worker.postMessage.mock.calls[0][0];

    analysis.updateSource("second");
    await nextTick();
    reply(first, { value: "first" });

    expect(analysis.state.status).toBe("analyzing");
    expect(analysis.state.option).toBeNull();

    await vi.waitFor(() => expect(worker.postMessage).toHaveBeenCalledTimes(2));
    const second = worker.postMessage.mock.calls[1][0];
    reply(second, { value: "second" });
    expect(analysis.state.status).toBe("ready");
    expect(analysis.state.option).toEqual({ value: "second" });

    analysis.updateSource("third");
    await nextTick();
    expect(analysis.state.status).toBe("analyzing");
    expect(analysis.state.option).toBeNull();
    expect(analysis.state.output).toBeNull();

    screen.unmount();
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
});
