import { defineComponent, nextTick } from "vue";
import { expect, it, vi } from "vitest";
import { useOptionAnalysis } from "../demo/composables/useOptionAnalysis";
import { render } from "./helpers/testing";

it("recovers from code that blocks the real worker", async () => {
  let analysis!: ReturnType<typeof useOptionAnalysis>;
  const screen = render(
    defineComponent(() => {
      analysis = useOptionAnalysis("({ title: { text: 'initial' } })");
      return () => null;
    }),
  );
  try {
    await vi.waitFor(() => expect(analysis.state.status).toBe("ready"), { timeout: 10000 });
    analysis.code.value = "export default (() => { while (true) {} })();";
    await nextTick();
    await vi.waitFor(() => expect(analysis.state.status).toBe("error"), { timeout: 7000 });
    expect(analysis.state.issues).toEqual([
      { kind: "runtime", severity: "error", message: expect.stringContaining("timed out") },
    ]);
    analysis.code.value = `({
      tooltip: { formatter() { throw new Error('do not call formatter'); } },
      series: [{ type: 'line', data: Array.from({ length: 100000 }, (_, i) => i) }]
    })`;
    await vi.waitFor(() => expect(analysis.state.status).toBe("ready"), { timeout: 10000 });
    expect(analysis.state.issues).toEqual([]);
    expect(analysis.state.dependencies).toEqual(["TooltipComponent", "LineChart"]);
  } finally {
    screen.unmount();
  }
}, 30000);
