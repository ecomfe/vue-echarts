import { describe, expect, it, vi } from "vitest";
import { effectScope, ref } from "vue";

const use = vi.hoisted(() => vi.fn());

vi.mock("echarts/core", async () => ({
  ...(await vi.importActual<typeof import("echarts/core")>("echarts/core")),
  use,
}));

describe("graphic entry", () => {
  it("registers the ECharts component and Vue runtime on import", async () => {
    const runtime = await import("../src/graphic/runtime");
    const { GraphicComponent } = await import("echarts/components");
    await import("../src/graphic/index");

    const scope = effectScope();
    const graphic = scope.run(() =>
      runtime.useRuntime({
        slots: {},
        manualUpdate: ref(false),
        requestUpdate: () => undefined,
      }),
    );

    expect(use).toHaveBeenCalledWith([GraphicComponent]);
    expect(graphic).toBeTruthy();
    scope.stop();
  });
});
