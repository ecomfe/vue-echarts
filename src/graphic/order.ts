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

function collect(value: unknown, orderMap: Map<string, number>, order: number): number {
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
  if (isGraphic(vnode)) {
    const props = vnode.props as Record<string, unknown> | null;
    const identity = resolveOrderKey(props?.id, vnode.key);
    if (identity) {
      orderMap.set(identity, order);
    }
    return order + 1;
  }

  const children = vnode.children;
  if (Array.isArray(children)) {
    for (const child of children) {
      order = collect(child, orderMap, order);
    }
  }
  return order;
}

export function collectOrder(value: unknown): Map<string, number> {
  const orderMap = new Map<string, number>();
  collect(value, orderMap, 0);
  return orderMap;
}
