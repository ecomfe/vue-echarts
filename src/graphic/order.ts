import { shallowRef } from "vue";
import type { VNode } from "vue";

import { resolveOrderKey } from "./identity";
import { GRAPHIC_COMPONENT_MARKER } from "./marker";

function isGraphic(vnode: VNode): boolean {
  const type = vnode.type as Record<string, unknown> | string | symbol;
  if (!type || typeof type !== "object") {
    return false;
  }
  return typeof (type as Record<string | symbol, unknown>)[GRAPHIC_COMPONENT_MARKER] === "string";
}

function collect(value: unknown, orderMap: Map<PropertyKey, number>, order: number): number {
  if (Array.isArray(value)) {
    for (const child of value) {
      order = collect(child, orderMap, order);
    }
    return order;
  }

  if (!value || typeof value !== "object") {
    return order;
  }
  const vnode = value as VNode;
  const children = vnode.children;
  const graphic = isGraphic(vnode);
  const type = typeof vnode.type;
  const opaqueComponent = !Array.isArray(children) && (type === "object" || type === "function");
  const props = vnode.props as Record<string, unknown> | null;
  const identity = graphic || opaqueComponent ? resolveOrderKey(props?.id, vnode.key) : null;
  if (identity !== null) {
    orderMap.set(identity, order);
  }
  if (graphic) {
    return order + 1;
  }

  // An opaque component's slot output is unavailable here, but its identity can
  // still anchor a graphic child that forwards the same id or key.
  if (identity !== null) {
    order++;
  }

  if (Array.isArray(children)) {
    for (const child of children) {
      order = collect(child, orderMap, order);
    }
  }
  return order;
}

function isSameOrder(current: Map<PropertyKey, number>, next: Map<PropertyKey, number>): boolean {
  if (current.size !== next.size) {
    return false;
  }
  for (const [key, order] of current) {
    if (next.get(key) !== order) {
      return false;
    }
  }
  return true;
}

export function createOrderTracker() {
  let current = new Map<PropertyKey, number>();
  const ref = shallowRef(current);

  return {
    ref,
    update(value: unknown): void {
      const next = new Map<PropertyKey, number>();
      collect(value, next, 0);
      if (!isSameOrder(current, next)) {
        current = next;
        ref.value = current;
      }
    },
  };
}
