import { defineComponent, getCurrentInstance, inject, onUnmounted, provide, shallowRef } from "vue";

import { warn } from "../utils";
import { GRAPHIC_COLLECTOR_KEY, GRAPHIC_ORDER_KEY, GRAPHIC_PARENT_ID_KEY } from "./context";
import { resolveGraphicIdentity } from "./identity";
import { GRAPHIC_COMPONENT_MARKER, type GraphicComponentType } from "./marker";
import { graphicCommonProps } from "./props-common";
import { graphicShapeProps } from "./props-shape";
import { warnOutsideGraphicSlot, warnMissingIdentity } from "./warn";

const graphicProps = {
  ...graphicCommonProps,
  ...graphicShapeProps,
} as const;

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

      let currentId: string | null = null;

      function register(): string {
        const identity = resolveGraphicIdentity(props.id, instance.vnode.key, instance.uid);
        if (identity.missingIdentity) {
          graphicCollector.warnOnce(`missing-id:${instance.uid}`, warnMissingIdentity(name));
        }
        if (currentId && currentId !== identity.id) {
          graphicCollector.unregister(currentId, instance.uid);
        }
        currentId = identity.id;
        const hintedOrder = identity.orderKey ? orderRef?.value.get(identity.orderKey) : undefined;

        graphicCollector.register({
          id: currentId,
          type,
          parentId: parentIdRef?.value ?? null,
          order: hintedOrder,
          props: props as Record<string, unknown>,
          handlers: attrs as Record<string, unknown>,
          sourceId: instance.uid,
        });
        return currentId;
      }

      onUnmounted(() => {
        if (currentId) {
          graphicCollector.unregister(currentId, instance.uid);
        }
      });

      if (type === "group") {
        const providedParent = shallowRef<string | null>(null);
        provide(GRAPHIC_PARENT_ID_KEY, providedParent);

        return () => {
          providedParent.value = register();
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
