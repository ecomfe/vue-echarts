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
  const props = vnode.props as Record<string, unknown> | null;
  const identity = typeof vnode.type === "string" ? null : resolveOrderKey(props?.id, vnode.key);
  if (identity) {
    orderMap.set(identity, order);
  }
  if (isGraphic(vnode)) {
    return order + 1;
  }

  // A keyed wrapper's slot output is not available here, but it can still anchor a
  // graphic child that forwards the same id or key.
  if (identity) {
    order++;
  }

  const children = vnode.children;
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
  let next = new Map<PropertyKey, number>();
  const ref = shallowRef(current);

  return {
    ref,
    update(value: unknown): void {
      next.clear();
      collect(value, next, 0);
      if (!isSameOrder(current, next)) {
        current = next;
        next = new Map();
        ref.value = current;
      }
    },
  };
}
