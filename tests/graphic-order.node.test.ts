import { describe, expect, it, vi } from "vitest";
import { Fragment, h } from "vue";

import { resolveIdentity } from "../src/graphic/identity";
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

  it("ignores the identity of transparent wrappers", () => {
    const order = createOrderTracker();
    const createTree = (key: string) =>
      h(Fragment, { key }, [h(RectGraphic, { id: "first" }), h(RectGraphic, { id: "second" })]);

    order.update(createTree("before"));
    const orderMap = order.ref.value;

    expect([...orderMap]).toEqual([
      ["id:first", 0],
      ["id:second", 1],
    ]);

    order.update(createTree("after"));
    expect(order.ref.value).toBe(orderMap);
  });

  it("keeps vnode key types distinct and ordered", () => {
    const keys: PropertyKey[] = [Symbol("rect"), Symbol("rect"), "1", 1, 0];
    const identities = keys.map((key, uid) => resolveIdentity(undefined, key, uid));
    const order = createOrderTracker();

    order.update(keys.map((key) => h(RectGraphic, { key })));

    expect(new Set(identities.map(({ id }) => id)).size).toBe(5);
    expect(identities.every(({ missingIdentity }) => !missingIdentity)).toBe(true);
    expect([...order.ref.value.values()]).toEqual([0, 1, 2, 3, 4]);
  });

  it("uses a zero-keyed component as an order anchor", () => {
    const order = createOrderTracker();

    order.update([h({ render: () => null }, { key: 0 }), h(RectGraphic, { id: "after" })]);

    expect(order.ref.value.get("id:after")).toBe(1);
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
