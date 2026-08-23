import {
  defineComponent,
  getCurrentInstance,
  inject,
  onBeforeUnmount,
  provide,
  shallowRef,
  watch,
} from "vue";

import { warn } from "../utils";
import { GRAPHIC_COLLECTOR_KEY, GRAPHIC_ORDER_KEY, GRAPHIC_PARENT_ID_KEY } from "./context";
import { resolveIdentity } from "./identity";
import { GRAPHIC_COMPONENT_MARKER, type GraphicComponentType } from "./marker";
import { collectOrder } from "./order";
import { commonProps } from "./props-common";
import { shapeProps } from "./props-shape";
import type { GraphicEmits } from "./types";

const componentProps = {
  ...commonProps,
  ...shapeProps,
} as const;

export function createComponent(name: string, type: GraphicComponentType) {
  const component = defineComponent({
    name,
    inheritAttrs: false,
    props: componentProps,
    emits: {} as unknown as GraphicEmits,
    setup(props, { attrs, slots }) {
      const instance = getCurrentInstance()!;
      const collector = inject(GRAPHIC_COLLECTOR_KEY, null);
      const parentIdRef = inject(GRAPHIC_PARENT_ID_KEY, null);
      const parentOrderRef = inject(GRAPHIC_ORDER_KEY, null);

      if (!collector) {
        warn(`\`${name}\` must be used inside \`#graphic\` slot.`);
        return () => null;
      }
      const { register: registerNode, unregister, requestFlush, warn: warnScoped } = collector;
      let currentId: string | null = null;

      watch(props, requestFlush, { deep: true });

      function register(): string {
        const identity = resolveIdentity(props.id, instance.vnode.key, instance.uid);
        if (identity.missingIdentity) {
          warnScoped(
            `\`${name}\` is missing \`id\` and \`key\`. Updates might be unstable in \`v-for\`.`,
            {
              onceKey: `missing-id:${instance.uid}`,
            },
          );
        }
        if (currentId !== null && currentId !== identity.id) {
          unregister(currentId, instance.uid);
        }
        currentId = identity.id;
        const hintedOrder = identity.orderKey
          ? parentOrderRef?.value.get(identity.orderKey)
          : undefined;

        registerNode({
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

      onBeforeUnmount(() => unregister(currentId!, instance.uid));

      if (type === "group") {
        const providedParent = shallowRef<string | null>(null);
        const childOrderRef = shallowRef<Map<string, number>>(new Map());
        provide(GRAPHIC_PARENT_ID_KEY, providedParent);
        provide(GRAPHIC_ORDER_KEY, childOrderRef);

        return () => {
          providedParent.value = register();
          const content = slots.default?.() ?? null;
          childOrderRef.value = collectOrder(content);
          return content;
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

export type GraphicComponent = ReturnType<typeof createComponent>;
