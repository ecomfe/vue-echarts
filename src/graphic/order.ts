import type { VNode } from "vue";

import { resolveGraphicOrderKey } from "./identity";
import { GRAPHIC_COMPONENT_MARKER, type GraphicComponentType } from "./marker";

export function getGraphicType(vnode: unknown): GraphicComponentType | null {
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

export function collectGraphicOrder(
  value: unknown,
  orderMap: Map<string, number>,
  order: number,
): number {
  if (Array.isArray(value)) {
    for (const child of value) {
      order = collectGraphicOrder(child, orderMap, order);
    }
    return order;
  }

  if (!value || typeof value !== "object") {
    return order;
  }
  const vnode = value as VNode;
  const type = getGraphicType(vnode);
  if (type) {
    const props = vnode.props as Record<string, unknown> | null;
    const identity = resolveGraphicOrderKey(props?.id, vnode.key);
    if (identity) {
      orderMap.set(identity, order);
    }
    order += 1;
  }

  if (type === "group") {
    const slot = (vnode.children as { default?: () => unknown } | null)?.default;
    if (slot) {
      return collectGraphicOrder(slot(), orderMap, order);
    }
  }

  const children = vnode.children;
  if (Array.isArray(children)) {
    for (const child of children) {
      order = collectGraphicOrder(child, orderMap, order);
    }
  }
  return order;
}
