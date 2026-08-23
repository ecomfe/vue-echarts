import { describe, expect, it, vi } from "vitest";
import { h } from "vue";

import { GRAPHIC_COMPONENT_MARKER } from "../src/graphic/marker";
import { createOrderTracker } from "../src/graphic/order";

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
    const order = createOrderTracker();
    order.update([
      undefined,
      1,
      { type: "div" },
      h({
        render: () => null,
      }),
    ]);

    expect(order.ref.value.size).toBe(0);
  });

  it("collects id order from regular graphic children", () => {
    const order = createOrderTracker();
    const container = h("div", [h(RectGraphic, { id: "first" }), h(RectGraphic, { id: "second" })]);

    order.update(container);
    const orderMap = order.ref.value;

    expect(orderMap.get("id:first")).toBe(0);
    expect(orderMap.get("id:second")).toBe(1);
    order.update(container);
    expect(order.ref.value).toBe(orderMap);

    order.update(h("div", [h(RectGraphic, { id: "second" }), h(RectGraphic, { id: "first" })]));
    const reordered = order.ref.value;
    expect(reordered).not.toBe(orderMap);
    expect(reordered.get("id:second")).toBe(0);
    expect(reordered.get("id:first")).toBe(1);

    order.update(h(RectGraphic, { id: "third" }));
    expect(orderMap.get("id:first")).toBe(0);
    expect(orderMap.get("id:second")).toBe(1);
  });

  it("leaves group slot collection to the group render", () => {
    const order = createOrderTracker();
    const slot = vi.fn(() => h(RectGraphic, { id: "child-1" }));
    order.update(h(GroupGraphic, { id: "group-1" }, slot));

    expect(order.ref.value.get("id:group-1")).toBe(0);
    expect(order.ref.value.has("id:child-1")).toBe(false);
    expect(slot).not.toHaveBeenCalled();
  });
});
