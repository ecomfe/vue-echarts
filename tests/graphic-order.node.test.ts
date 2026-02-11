import { describe, expect, it } from "vitest";
import { h } from "vue";

import { GRAPHIC_COMPONENT_MARKER } from "../src/graphic/marker";
import { collectGraphicOrder, getGraphicType } from "../src/graphic/order";

const RectGraphic = {
  [GRAPHIC_COMPONENT_MARKER]: "rect",
  render: () => null,
} as const;

const GroupGraphic = {
  [GRAPHIC_COMPONENT_MARKER]: "group",
  render: () => null,
} as const;

describe("graphic order helpers", () => {
  it("detects marked graphic vnode types and ignores invalid values", () => {
    expect(getGraphicType(undefined)).toBeNull();
    expect(getGraphicType(1)).toBeNull();
    expect(getGraphicType({ type: "div" } as any)).toBeNull();
    expect(
      getGraphicType(
        h({
          render: () => null,
        }),
      ),
    ).toBeNull();
    expect(getGraphicType(h(RectGraphic))).toBe("rect");
  });

  it("returns current order for non-object entries", () => {
    const orderMap = new Map<string, number>();
    const order = collectGraphicOrder(42, orderMap, 3);

    expect(order).toBe(3);
    expect(orderMap.size).toBe(0);
  });

  it("collects id order from regular graphic children", () => {
    const orderMap = new Map<string, number>();
    const container = h("div", [h(RectGraphic, { id: "first" }), h(RectGraphic, { id: "second" })]);

    const order = collectGraphicOrder(container, orderMap, 0);

    expect(order).toBe(2);
    expect(orderMap.get("id:first")).toBe(0);
    expect(orderMap.get("id:second")).toBe(1);
  });

  it("descends into group default slot content", () => {
    const orderMap = new Map<string, number>();
    const group = h(GroupGraphic, { id: "group-1" }, () => [h(RectGraphic, { id: "child-1" })]);

    const order = collectGraphicOrder(group, orderMap, 0);

    expect(order).toBe(2);
    expect(orderMap.get("id:group-1")).toBe(0);
    expect(orderMap.get("id:child-1")).toBe(1);
  });
});
