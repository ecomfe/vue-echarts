import { expect, it, vi } from "vitest";

import { render } from "./helpers/testing";
import ManualChart from "../demo/examples/ManualChart.vue";

vi.mock("../src/ECharts", async () => {
  const { defineComponent, h } = await import("vue");
  return {
    default: defineComponent({
      inheritAttrs: false,
      setup(_, { expose }) {
        expose({ setOption() {} });
        return () => h("div");
      },
    }),
  };
});

vi.mock("../demo/data/flight.json", async () => {
  await new Promise((resolve) => setTimeout(resolve, 100));
  return {
    default: {
      airports: [],
      routes: [],
    },
  };
});

vi.mock("../demo/data/world.json", () => ({
  default: { type: "FeatureCollection", features: [] },
}));

it("reports progress while loading the manual chart data", async () => {
  render(ManualChart);
  const button = document.querySelector<HTMLButtonElement>("button");
  if (!button) {
    throw new Error("Expected a load button.");
  }

  expect(button.textContent?.trim()).toBe("Load");
  expect(button.getAttribute("aria-busy")).toBe("false");

  button.click();

  await vi.waitFor(() => {
    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button.textContent?.trim()).toBe("Loading…");
  });

  await vi.waitFor(() => {
    expect(button.disabled).toBe(false);
    expect(button.getAttribute("aria-busy")).toBe("false");
    expect(button.textContent?.trim()).toBe("Load");
  }, 5000);
});
