import { Teleport, defineComponent, h, onUnmounted, provide, shallowRef } from "vue";
import type { VNode } from "vue";

import { isBrowser } from "../utils";
import type { GraphicCollector } from "./collector";
import { GRAPHIC_COLLECTOR_KEY, GRAPHIC_ORDER_KEY, GRAPHIC_PARENT_ID_KEY } from "./context";
import { GRAPHIC_COMPONENT_MARKER, type GraphicComponentType } from "./marker";

function getGraphicIdentity(vnode: VNode): string | null {
  const props = vnode.props as Record<string, unknown> | null;
  if (props?.id != null) {
    return `id:${String(props.id)}`;
  }
  if (vnode.key != null) {
    return `key:${String(vnode.key)}`;
  }
  return null;
}

function getGraphicType(vnode: unknown): GraphicComponentType | null {
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

function collectGraphicOrder(value: unknown, orderMap: Map<string, number>, order: number): number {
  if (Array.isArray(value)) {
    for (const item of value) {
      order = collectGraphicOrder(item, orderMap, order);
    }
    return order;
  }

  if (!value || typeof value !== "object") {
    return order;
  }

  const vnode = value as VNode;
  const graphicType = getGraphicType(vnode);
  if (graphicType) {
    const identity = getGraphicIdentity(vnode);
    if (identity) {
      orderMap.set(identity, order);
    }
    order += 1;
  }

  const children = vnode.children;
  if (graphicType === "group") {
    const slot = (children as { default?: () => unknown } | null)?.default;
    if (slot) {
      return collectGraphicOrder(slot(), orderMap, order);
    }
  }

  if (Array.isArray(children)) {
    for (const child of children) {
      order = collectGraphicOrder(child, orderMap, order);
    }
  }

  return order;
}

export const GraphicMount = defineComponent({
  name: "GraphicMount",
  props: {
    collector: {
      type: Object as () => GraphicCollector,
      required: true,
    },
  },
  setup(props, { slots }) {
    const detachedRoot = isBrowser() ? document.createElement("div") : undefined;
    const parentId = shallowRef<string | null>(null);
    const orderMapRef = shallowRef<Map<string, number>>(new Map());

    provide(GRAPHIC_COLLECTOR_KEY, props.collector);
    provide(GRAPHIC_PARENT_ID_KEY, parentId);
    provide(GRAPHIC_ORDER_KEY, orderMapRef);

    onUnmounted(() => {
      detachedRoot?.remove();
    });

    return () => {
      props.collector.beginPass();
      const content = slots.default?.();
      const orderMap = new Map<string, number>();
      collectGraphicOrder(content, orderMap, 0);
      orderMapRef.value = orderMap;

      return detachedRoot
        ? h(Teleport, { to: detachedRoot }, h("div", { style: { display: "contents" } }, content))
        : null;
    };
  },
});
