import { describe, expect, it, vi } from "vitest";
import { h } from "vue";

import { GRAPHIC_COMPONENT_MARKER } from "../src/graphic/marker";
import { collectOrder } from "../src/graphic/order";

const RectGraphic = {
  [GRAPHIC_COMPONENT_MARKER]: "rect",
  render: () => null,
} as const;

const GroupGraphic = {
  [GRAPHIC_COMPONENT_MARKER]: "group",
  render: () => null,
} as const;

describe("graphic order helpers", () => {
  it("ignores invalid and unmarked entries", () => {
    expect(
      collectOrder([
        undefined,
        1,
        { type: "div" },
        h({
          render: () => null,
        }),
      ]).size,
    ).toBe(0);
  });

  it("collects id order from regular graphic children", () => {
    const container = h("div", [h(RectGraphic, { id: "first" }), h(RectGraphic, { id: "second" })]);

    const orderMap = collectOrder(container);

    expect(orderMap.get("id:first")).toBe(0);
    expect(orderMap.get("id:second")).toBe(1);
  });

  it("leaves group slot collection to the group render", () => {
    const slot = vi.fn(() => h(RectGraphic, { id: "child-1" }));
    const orderMap = collectOrder(h(GroupGraphic, { id: "group-1" }, slot));

    expect(orderMap.get("id:group-1")).toBe(0);
    expect(orderMap.has("id:child-1")).toBe(false);
    expect(slot).not.toHaveBeenCalled();
  });
});
