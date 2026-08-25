import {
  defineComponent,
  getCurrentInstance,
  inject,
  onBeforeUnmount,
  provide,
  shallowRef,
  type PropType,
  watch,
} from "vue";

import { warn } from "../utils";
import { GRAPHIC_COLLECTOR_KEY, GRAPHIC_ORDER_KEY, GRAPHIC_PARENT_ID_KEY } from "./context";
import { resolveIdentity } from "./identity";
import { GRAPHIC_COMPONENT_MARKER, type GraphicComponentType } from "./marker";
import { createOrderTracker } from "./order";
import {
  COMMON_PROP_KEYS,
  COMMON_STYLE_KEYS,
  DISPLAYABLE_PROP_KEYS,
  GROUP_PROP_KEYS,
  IMAGE_STYLE_KEYS,
  PATH_PROP_KEYS,
  PATH_STYLE_KEYS,
  TEXT_ATTACHMENT_PROP_KEYS,
  TEXT_COMMON_STYLE_KEYS,
  TEXT_STYLE_KEYS,
  commonProps,
  withUndefinedDefault,
} from "./props-common";
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
const textPropOverrides = {
  width: [String, Number] as PropType<string | number>,
  fill: String,
  stroke: String,
  lineDash: withUndefinedDefault([Array, Boolean] as PropType<number[] | false>),
} as const;

const NESTED_SHAPE_PROP_KEYS = ["shape", "shapeTransition"] as const;
const NESTED_STYLE_PROP_KEYS = ["style", "styleTransition"] as const;
type NestedShapePropKey = (typeof NESTED_SHAPE_PROP_KEYS)[number];
type NestedStylePropKey = (typeof NESTED_STYLE_PROP_KEYS)[number];
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

function getComponentProps(type: GraphicComponentType): Record<string, unknown> {
  const shapeKeys: readonly string[] | undefined =
    SHAPE_KEYS_BY_TYPE[type as keyof typeof SHAPE_KEYS_BY_TYPE];
  const commonKeys =
    type === "text"
      ? COMMON_PROP_KEYS.filter(
          (key) => !TEXT_ATTACHMENT_PROP_KEYS.includes(key as GraphicTextAttachmentPropKey),
        )
      : COMMON_PROP_KEYS;
  const keys: string[] = [...commonKeys];
  if (type === "group") {
    keys.push(...GROUP_PROP_KEYS);
  } else {
    keys.push(...DISPLAYABLE_PROP_KEYS, ...NESTED_STYLE_PROP_KEYS);
    if (shapeKeys) {
      keys.push(
        ...NESTED_SHAPE_PROP_KEYS,
        ...PATH_PROP_KEYS,
        ...shapeKeys,
        ...COMMON_STYLE_KEYS,
        ...PATH_STYLE_KEYS,
      );
    } else if (type === "text") {
      keys.push(...TEXT_COMMON_STYLE_KEYS, ...TEXT_STYLE_KEYS);
    } else {
      keys.push(...COMMON_STYLE_KEYS, ...IMAGE_STYLE_KEYS);
    }
  }
  const props = Object.fromEntries(
    keys.map((key) => [key, componentProps[key as keyof typeof componentProps]]),
  );

  if (type === "text") {
    Object.assign(props, textPropOverrides);
  } else if (type !== "rect" && "r" in props) {
    props.r = Number;
  }

  return props;
}

/* @__NO_SIDE_EFFECTS__ */
export function createComponent<T extends GraphicComponentType>(name: string, type: T) {
  const component = defineComponent({
    name,
    inheritAttrs: false,
    props: getComponentProps(type) as unknown as ComponentProps<T>,
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
