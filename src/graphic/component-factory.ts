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
import { createOrderTracker } from "./order";
import { commonProps } from "./props-common";
import type {
  GraphicCommonPropKey,
  GraphicCommonStyleKey,
  GraphicDisplayablePropKey,
  GraphicGroupPropKey,
  GraphicImageStyleKey,
  GraphicPathPropKey,
  GraphicPathStyleKey,
  GraphicTextStyleKey,
} from "./props-common";
import { SHAPE_KEYS_BY_TYPE, shapeProps } from "./props-shape";
import type { GraphicEmits } from "./types";

const componentProps = {
  ...commonProps,
  ...shapeProps,
} as const;
const scalarRadiusProps = {
  ...componentProps,
  r: Number,
} as const;

type NestedShapePropKey = "shape" | "shapeTransition";
type NestedStylePropKey = "style" | "styleTransition";
type SpecializedPropKey =
  | GraphicCommonStyleKey
  | GraphicDisplayablePropKey
  | GraphicPathPropKey
  | GraphicPathStyleKey
  | GraphicTextStyleKey
  | GraphicImageStyleKey
  | NestedShapePropKey
  | NestedStylePropKey
  | keyof typeof shapeProps;
type SharedPropKey =
  | Exclude<keyof typeof componentProps, SpecializedPropKey>
  | GraphicCommonPropKey;
type StylePropKey<T extends GraphicComponentType> = T extends "group"
  ? never
  :
      | NestedStylePropKey
      | GraphicCommonStyleKey
      | (T extends keyof typeof SHAPE_KEYS_BY_TYPE
          ? GraphicPathStyleKey
          : T extends "text"
            ? GraphicTextStyleKey
            : T extends "image"
              ? GraphicImageStyleKey
              : never);
type PathPropKey<T extends GraphicComponentType> = T extends keyof typeof SHAPE_KEYS_BY_TYPE
  ? NestedShapePropKey | GraphicPathPropKey | (typeof SHAPE_KEYS_BY_TYPE)[T][number]
  : never;
type GroupPropKey<T extends GraphicComponentType> = T extends "group" ? GraphicGroupPropKey : never;
type DisplayablePropKey<T extends GraphicComponentType> = T extends "group"
  ? never
  : GraphicDisplayablePropKey;
type ComponentProps<T extends GraphicComponentType> = Pick<
  Omit<typeof componentProps, "r"> & {
    readonly r: T extends "rect" ? (typeof componentProps)["r"] : NumberConstructor;
  },
  Extract<
    SharedPropKey | GroupPropKey<T> | DisplayablePropKey<T> | PathPropKey<T> | StylePropKey<T>,
    keyof typeof componentProps
  >
>;

/* @__NO_SIDE_EFFECTS__ */
export function createComponent<T extends GraphicComponentType>(name: string, type: T) {
  const component = defineComponent({
    name,
    inheritAttrs: false,
    props: (type === "rect" ? componentProps : scalarRadiusProps) as ComponentProps<T>,
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

      watch([props, () => attrs], requestFlush, { deep: true });

      function register(): string {
        const identity = resolveIdentity(
          (props as { id?: string | number }).id,
          instance.vnode.key,
          instance.uid,
        );
        if (identity.missingIdentity) {
          warnScoped(
            `\`${name}\` is missing \`id\` and \`key\`. Updates might be unstable in \`v-for\`.`,
            `missing-id:${instance.uid}`,
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
        const childOrder = createOrderTracker();
        provide(GRAPHIC_PARENT_ID_KEY, providedParent);
        provide(GRAPHIC_ORDER_KEY, childOrder.ref);

        return () => {
          providedParent.value = register();
          const content = slots.default?.() ?? null;
          childOrder.update(content);
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

export type GraphicComponent<T extends GraphicComponentType> = ReturnType<
  typeof createComponent<T>
>;
