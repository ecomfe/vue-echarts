import {
  defineComponent,
  getCurrentInstance,
  inject,
  onUnmounted,
  provide,
  shallowRef,
  unref,
} from "vue";

import { warn } from "../utils";
import { GRAPHIC_COLLECTOR_KEY, GRAPHIC_ORDER_KEY, GRAPHIC_PARENT_ID_KEY } from "./context";
import { GRAPHIC_COMPONENT_MARKER } from "./marker";
import { graphicCommonProps } from "./props-common";
import { graphicShapeProps } from "./props-shape";
import { warnOutsideGraphicSlot, warnMissingIdentity } from "./warn";

type AnyProps = Record<string, unknown>;

const graphicProps = {
  ...graphicCommonProps,
  ...graphicShapeProps,
} as const;

function parseIdentity(
  props: { id?: string | number },
  instance: { uid: number; vnode: { key: unknown } },
): { id: string; key: string | null; missing: boolean } {
  if (props.id != null) {
    const id = String(props.id);
    return { id, key: `id:${id}`, missing: false };
  }
  const vnodeKey = instance.vnode.key;
  if (vnodeKey != null) {
    const id = String(vnodeKey);
    return { id, key: `key:${id}`, missing: false };
  }
  return { id: `__ve_graphic_${instance.uid}`, key: null, missing: true };
}

export function createGraphicComponent(name: string, type: string) {
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
        const next = parseIdentity(props, instance);
        if (next.missing) {
          graphicCollector.warnOnce(`missing-id:${instance.uid}`, warnMissingIdentity(name));
        }
        if (currentId.value && currentId.value !== next.id) {
          graphicCollector.unregister(currentId.value, instance.uid);
        }
        currentId.value = next.id;
        const hintedOrder = next.key ? unref(orderRef)?.get(next.key) : undefined;

        graphicCollector.register({
          id: next.id,
          type,
          parentId: parentIdRef ? unref(parentIdRef) : null,
          order: hintedOrder,
          props: props as AnyProps,
          handlers: attrs as AnyProps,
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
