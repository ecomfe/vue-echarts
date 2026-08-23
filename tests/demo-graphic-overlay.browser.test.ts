import { nextTick } from "vue";
import type { ShallowRef } from "vue";
import { afterEach, expect, it, vi } from "vitest";

import { render } from "./helpers/testing";
import GraphicOverlay from "../demo/examples/GraphicOverlay.vue";

const mocks = vi.hoisted(() => ({
  motion: null as ShallowRef<"reduce" | "no-preference"> | null,
}));

vi.mock("@vueuse/core", async () => {
  const { shallowRef } = await import("vue");
  mocks.motion = shallowRef("reduce");
  return { usePreferredReducedMotion: () => mocks.motion };
});

vi.mock("../demo/composables/useDemoDark", async () => {
  const { shallowRef } = await import("vue");
  return { useDemoDark: () => shallowRef(false) };
});

vi.mock("../src/ECharts", async () => {
  const { defineComponent, h } = await import("vue");
  return {
    default: defineComponent({
      inheritAttrs: false,
      props: { option: Object },
      setup: (props) => () =>
        h("div", {
          "data-animation-duration": String(
            (props.option as { animationDurationUpdate: number }).animationDurationUpdate,
          ),
        }),
    }),
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

it("skips and stops overlay animation when reduced motion is preferred", async () => {
  const requestFrame = vi.spyOn(window, "requestAnimationFrame").mockReturnValue(7);
  const cancelFrame = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  const random = vi.spyOn(Math, "random").mockReturnValue(0);
  render(GraphicOverlay);

  const randomize = Array.from(document.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === "Randomize trend",
  );
  if (!randomize || !mocks.motion) {
    throw new Error("Expected graphic overlay controls.");
  }
  const chart = document.querySelector("[data-animation-duration]");
  expect(chart?.getAttribute("data-animation-duration")).toBe("0");

  randomize.click();
  await nextTick();
  expect(requestFrame).not.toHaveBeenCalled();

  mocks.motion.value = "no-preference";
  await nextTick();
  expect(chart?.getAttribute("data-animation-duration")).toBe("300");
  random.mockReturnValue(1);
  randomize.click();
  await nextTick();
  expect(requestFrame).toHaveBeenCalledOnce();

  mocks.motion.value = "reduce";
  await nextTick();
  expect(chart?.getAttribute("data-animation-duration")).toBe("0");
  expect(cancelFrame).toHaveBeenCalledWith(7);
  expect(requestFrame).toHaveBeenCalledOnce();
});
