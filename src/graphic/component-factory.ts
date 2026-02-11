import { defineComponent, getCurrentInstance, inject, onUnmounted, provide, shallowRef } from "vue";

import { warn } from "../utils";
import { GRAPHIC_COLLECTOR_KEY, GRAPHIC_ORDER_KEY, GRAPHIC_PARENT_ID_KEY } from "./context";
import { GRAPHIC_COMPONENT_MARKER, type GraphicComponentType } from "./marker";
import { graphicCommonProps } from "./props-common";
import { graphicShapeProps } from "./props-shape";
import { warnOutsideGraphicSlot, warnMissingIdentity } from "./warn";

const graphicProps = {
  ...graphicCommonProps,
  ...graphicShapeProps,
} as const;

type GraphicIdentity = {
  id: string;
  orderKey: string | undefined;
  missing: boolean;
};

function resolveIdentity(
  propsId: string | number | undefined,
  vnodeKey: unknown,
  uid: number,
): GraphicIdentity {
  if (propsId != null) {
    const id = String(propsId);
    return { id, orderKey: `id:${id}`, missing: false };
  }
  if (vnodeKey != null) {
    const id = String(vnodeKey);
    return { id, orderKey: `key:${id}`, missing: false };
  }
  return { id: `__ve_graphic_${uid}`, orderKey: undefined, missing: true };
}

export function createGraphicComponent(name: string, type: GraphicComponentType) {
  const component = defineComponent({
    name,
    inheritAttrs: false,
    props: graphicProps,
    setup(props, { attrs, slots }) {
      const instance = getCurrentInstance()!;
      const collector = inject(GRAPHIC_COLLECTOR_KEY, null);
      const parentIdRef = inject(GRAPHIC_PARENT_ID_KEY, null);
      const orderRef = inject(GRAPHIC_ORDER_KEY, null);

      if (!collector) {
        warn(warnOutsideGraphicSlot(name));
        return () => null;
      }
      const graphicCollector = collector;

      const currentId = shallowRef<string | null>(null);

      function register(): void {
        const identity = resolveIdentity(props.id, instance.vnode.key, instance.uid);
        if (identity.missing) {
          graphicCollector.warnOnce(`missing-id:${instance.uid}`, warnMissingIdentity(name));
        }
        if (currentId.value && currentId.value !== identity.id) {
          graphicCollector.unregister(currentId.value, instance.uid);
        }
        currentId.value = identity.id;
        const hintedOrder = identity.orderKey ? orderRef?.value.get(identity.orderKey) : undefined;

        graphicCollector.register({
          id: identity.id,
          type,
          parentId: parentIdRef?.value ?? null,
          order: hintedOrder,
          props: props as Record<string, unknown>,
          handlers: attrs as Record<string, unknown>,
          sourceId: instance.uid,
        });
      }

      onUnmounted(() => {
        if (currentId.value) {
          graphicCollector.unregister(currentId.value, instance.uid);
        }
      });

      if (type === "group") {
        const providedParent = shallowRef<string | null>(null);
        provide(GRAPHIC_PARENT_ID_KEY, providedParent);

        return () => {
          register();
          providedParent.value = currentId.value;
          return slots.default?.() ?? null;
        };
      }

      return () => {
        register();
        return null;
      };
    },
  });

  (component as unknown as Record<symbol, unknown>)[GRAPHIC_COMPONENT_MARKER] = type;

  return component;
}
