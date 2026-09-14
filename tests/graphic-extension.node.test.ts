import { describe, expect, it, vi } from "vitest";
import { effectScope, ref } from "vue";
import { GraphicComponent } from "echarts/components";
import { useRuntime } from "../src/graphic/runtime";

const use = vi.hoisted(() => vi.fn());

vi.mock("echarts/core", async () => ({
  ...(await vi.importActual<typeof import("echarts/core")>("echarts/core")),
  use,
}));

describe("graphic entry", () => {
  it("registers the ECharts component and Vue runtime on import", async () => {
    expect(use).not.toHaveBeenCalled();
    await import("../src/graphic/index");

    const scope = effectScope();
    const graphic = scope.run(() =>
      useRuntime({
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
