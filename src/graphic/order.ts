import type { VNode } from "vue";

import { resolveOrderKey } from "./identity";
import { GRAPHIC_COMPONENT_MARKER, type GraphicComponentType } from "./marker";

export function getType(vnode: unknown): GraphicComponentType | null {
  if (!vnode || typeof vnode !== "object") {
    return null;
  }
  const type = (vnode as VNode).type as Record<string, unknown> | string | symbol;
  if (!type || typeof type !== "object") {
    return null;
  }
  const mark = (type as Record<string | symbol, unknown>)[GRAPHIC_COMPONENT_MARKER];
  return typeof mark === "string" ? (mark as GraphicComponentType) : null;
}

export function collectOrder(value: unknown, orderMap: Map<string, number>, order: number): number {
  if (Array.isArray(value)) {
    for (const child of value) {
      order = collectOrder(child, orderMap, order);
    }
    return order;
  }

  if (!value || typeof value !== "object") {
    return order;
  }
  const vnode = value as VNode;
  const type = getType(vnode);
  if (type) {
    const props = vnode.props as Record<string, unknown> | null;
    const identity = resolveOrderKey(props?.id, vnode.key);
    if (identity) {
      orderMap.set(identity, order);
    }
    order += 1;
  }

  if (type === "group") {
    const slot = (vnode.children as { default?: () => unknown } | null)?.default;
    if (slot) {
      return collectOrder(slot(), orderMap, order);
    }
  }

  const children = vnode.children;
  if (Array.isArray(children)) {
    for (const child of children) {
      order = collectOrder(child, orderMap, order);
    }
  }
  return order;
}
