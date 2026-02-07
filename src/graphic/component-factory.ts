import {
  defineComponent,
  getCurrentInstance,
  inject,
  onUnmounted,
  provide,
  shallowRef,
  toRaw,
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

function resolveId(
  props: { id?: string | number },
  instance: NonNullable<ReturnType<typeof getCurrentInstance>>,
): string {
  if (props.id != null) {
    return String(props.id);
  }
  const key = instance?.vnode.key;
  if (key != null) {
    return String(key);
  }
  return `__ve_graphic_${instance.uid}`;
}

function resolveIdentity(
  props: { id?: string | number },
  instance: NonNullable<ReturnType<typeof getCurrentInstance>>,
): string | null {
  if (props.id != null) {
    return `id:${String(props.id)}`;
  }
  const key = instance.vnode.key;
  if (key != null) {
    return `key:${String(key)}`;
  }
  return null;
}

function cloneProps(props: AnyProps): AnyProps {
  const raw = toRaw(props) as AnyProps;
  const clone: AnyProps = { ...raw };
  if (raw.shape && typeof raw.shape === "object") {
    clone.shape = toRaw(raw.shape as AnyProps);
  }
  if (raw.style && typeof raw.style === "object") {
    clone.style = toRaw(raw.style as AnyProps);
  }
  return clone;
}

function extractHandlers(attrs: AnyProps): AnyProps {
  const handlers: AnyProps = {};
  for (const key of Object.keys(attrs)) {
    if (key.startsWith("on")) {
      handlers[key] = attrs[key];
    }
  }
  return handlers;
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
        const nextId = resolveId(props, instance);
        if (!props.id && instance.vnode.key == null) {
          graphicCollector.warnOnce(`missing-id:${instance.uid}`, warnMissingIdentity(name));
        }
        if (currentId.value && currentId.value !== nextId) {
          graphicCollector.unregister(currentId.value, instance.uid);
        }
        currentId.value = nextId;
        const identity = resolveIdentity(props, instance);
        const hintedOrder = identity != null ? unref(orderRef)?.get(identity) : undefined;

        graphicCollector.register({
          id: nextId,
          type,
          parentId: parentIdRef ? unref(parentIdRef) : null,
          order: hintedOrder,
          props: cloneProps(props as AnyProps),
          handlers: extractHandlers(attrs as AnyProps),
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
