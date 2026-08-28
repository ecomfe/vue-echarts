import {
  defineComponent,
  getCurrentInstance,
  inject,
  onBeforeUnmount,
  provide,
  shallowRef,
  type Slot,
  type SlotsType,
  watch,
} from "vue";

import type { PublicComponent } from "../types";
import { warn } from "../utils";
import { GRAPHIC_COLLECTOR_KEY, GRAPHIC_ORDER_KEY, GRAPHIC_PARENT_ID_KEY } from "./context";
import { resolveIdentity } from "./identity";
import { GRAPHIC_COMPONENT_MARKER, type GraphicComponentType } from "./marker";
import { createOrderTracker } from "./order";
import { commonProps, textPropOverrides } from "./props-common";
import type {
  GraphicCommonPropKey,
  GraphicCommonStyleKey,
  GraphicDisplayablePropKey,
  GraphicGroupPropKey,
  GraphicImageStyleKey,
  GraphicPathPropKey,
  GraphicPathStyleKey,
  GraphicTextAttachmentPropKey,
  GraphicTextCommonStyleKey,
  GraphicTextStyleKey,
} from "./props-common";
import { SHAPE_KEYS_BY_TYPE, shapeProps } from "./props-shape";
import type { GraphicEmits } from "./types";

const componentProps = {
  ...commonProps,
  ...shapeProps,
} as const;
const runtimeProps = {
  ...componentProps,
  width: textPropOverrides.width,
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
type SharedPropKey<T extends GraphicComponentType> = Exclude<
  Exclude<keyof typeof componentProps, SpecializedPropKey> | GraphicCommonPropKey,
  T extends "text" ? GraphicTextAttachmentPropKey : never
>;
type StylePropKey<T extends GraphicComponentType> = T extends "group"
  ? never
  :
      | NestedStylePropKey
      | (T extends "text" ? GraphicTextCommonStyleKey : GraphicCommonStyleKey)
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
type ComponentPropDefinitions<T extends GraphicComponentType> = T extends "text"
  ? Omit<typeof componentProps, keyof typeof textPropOverrides> & typeof textPropOverrides
  : T extends "rect"
    ? typeof componentProps
    : Omit<typeof componentProps, "r"> & { r: NumberConstructor };
type ComponentProps<T extends GraphicComponentType> = Pick<
  ComponentPropDefinitions<T>,
  Extract<
    SharedPropKey<T> | GroupPropKey<T> | DisplayablePropKey<T> | PathPropKey<T> | StylePropKey<T>,
    keyof typeof componentProps
  >
>;
type ComponentSlots<T extends GraphicComponentType> = SlotsType<
  T extends "group" ? { default?: Slot } : Record<never, never>
>;

/* @__NO_SIDE_EFFECTS__ */
export function createComponent<T extends GraphicComponentType>(
  name: string,
  type: T,
): GraphicComponent<T> {
  const component = defineComponent({
    name,
    inheritAttrs: false,
    props: runtimeProps as unknown as ComponentProps<T>,
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
      let warnedMissingIdentity = false;

      watch([props, () => attrs], requestFlush, { deep: true });

      function register(): string {
        const { id, orderKey } = resolveIdentity(
          (props as { id?: string | number }).id,
          instance.vnode.key,
          instance.uid,
        );
        if (orderKey === undefined && !warnedMissingIdentity) {
          warnedMissingIdentity = true;
          warnScoped(
            `\`${name}\` is missing \`id\` and \`key\`. Updates might be unstable in \`v-for\`.`,
          );
        }
        if (currentId !== null && currentId !== id) {
          unregister(currentId, instance.uid);
        }
        currentId = id;

        registerNode({
          id,
          type,
          parentId: parentIdRef!.value,
          order: orderKey !== undefined ? parentOrderRef?.value.get(orderKey) : undefined,
          props: props as Record<string, unknown>,
          handlers: attrs as Record<string, unknown>,
          sourceId: instance.uid,
        });
        return id;
      }

      onBeforeUnmount(() => unregister(currentId!, instance.uid));

      if (type === "group") {
        const providedParent = shallowRef<string | null>(null);
        const childOrder = createOrderTracker();
        provide(GRAPHIC_PARENT_ID_KEY, providedParent);
        provide(GRAPHIC_ORDER_KEY, childOrder.ref);

        return () => {
          providedParent.value = register();
          const content = (slots as { default?: Slot }).default?.() ?? null;
          childOrder.update(content);
          return content;
        };
      }

      return () => {
        register();
        return null;
      };
    },
  }) as GraphicComponent<T>;

  (component as unknown as Record<symbol, unknown>)[GRAPHIC_COMPONENT_MARKER] = type;

  return component;
}

export type GraphicComponent<T extends GraphicComponentType> = PublicComponent<
  ComponentProps<T>,
  Record<never, never>,
  GraphicEmits,
  ComponentSlots<T>
>;
