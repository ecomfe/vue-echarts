import { Teleport, defineComponent, h, onUnmounted, provide, shallowRef } from "vue";
import type { VNode } from "vue";

import { isBrowser } from "../utils";
import type { GraphicCollector } from "./collector";
import { GRAPHIC_COLLECTOR_KEY, GRAPHIC_ORDER_KEY, GRAPHIC_PARENT_ID_KEY } from "./context";

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

function isGraphicComponent(vnode: VNode): boolean {
  const type = vnode.type as Record<string, unknown> | string | symbol;
  return Boolean(
    type &&
    typeof type === "object" &&
    typeof (type as Record<string, unknown>).name === "string" &&
    ((type as Record<string, unknown>).name as string).startsWith("G"),
  );
}

function isGraphicGroup(vnode: VNode): boolean {
  const type = vnode.type as Record<string, unknown> | string | symbol;
  return (
    Boolean(type && typeof type === "object") && (type as Record<string, unknown>).name === "GGroup"
  );
}

function collectGraphicOrder(
  value: unknown,
  orderMap: Map<string, number>,
  cursor: { value: number },
): void {
  if (Array.isArray(value)) {
    value.forEach((item) => collectGraphicOrder(item, orderMap, cursor));
    return;
  }

  const vnode = value as VNode;
  if (isGraphicComponent(vnode)) {
    const identity = getGraphicIdentity(vnode);
    if (identity) {
      orderMap.set(identity, cursor.value);
    }
    cursor.value += 1;
  }

  const children = vnode.children;
  if (isGraphicGroup(vnode) && children && typeof children === "object" && "default" in children) {
    const slot = (children as { default?: () => unknown }).default;
    if (slot) {
      collectGraphicOrder(slot(), orderMap, cursor);
      return;
    }
  }

  if (Array.isArray(children)) {
    children.forEach((child) => collectGraphicOrder(child, orderMap, cursor));
  }
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
      collectGraphicOrder(content, orderMap, { value: 0 });
      orderMapRef.value = orderMap;
      props.collector.requestFlush();

      return detachedRoot
        ? h(Teleport, { to: detachedRoot }, h("div", { style: { display: "contents" } }, content))
        : null;
    };
  },
});
