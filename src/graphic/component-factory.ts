import {
  defineComponent,
  getCurrentInstance,
  h,
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
import { GRAPHIC_COLLECTOR_KEY, GRAPHIC_PARENT_ID_KEY } from "./context";
import { resolveIdentity } from "./identity";
import type { GraphicComponentType } from "./component-type";
import {
  COMMON_PROP_KEYS,
  COMMON_STYLE_KEYS,
  DISPLAYABLE_PROP_KEYS,
  GROUP_PROP_KEYS,
  PATH_PROP_KEYS,
  PATH_STYLE_KEYS,
  STYLE_KEYS_BY_TYPE,
  TEXT_COMMON_STYLE_KEYS,
  commonProps,
  textPropOverrides,
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

function getRuntimeProps(type: GraphicComponentType) {
  const keys: Array<keyof typeof componentProps> = COMMON_PROP_KEYS.filter(
    (key) => type !== "text" || (key !== "textContent" && key !== "textConfig"),
  );
  if (type === "group") {
    keys.push(...GROUP_PROP_KEYS);
  } else {
    const shapeKeys = SHAPE_KEYS_BY_TYPE[type as keyof typeof SHAPE_KEYS_BY_TYPE];
    const styleKeys = shapeKeys
      ? PATH_STYLE_KEYS
      : STYLE_KEYS_BY_TYPE[type as keyof typeof STYLE_KEYS_BY_TYPE];
    const commonStyleKeys = type === "text" ? TEXT_COMMON_STYLE_KEYS : COMMON_STYLE_KEYS;
    keys.push(
      "style",
      "styleTransition",
      ...DISPLAYABLE_PROP_KEYS,
      ...commonStyleKeys,
      ...styleKeys,
    );
    if (shapeKeys) {
      keys.push("shape", "shapeTransition", ...PATH_PROP_KEYS, ...shapeKeys);
    }
  }
  const definitions =
    type === "text"
      ? { ...componentProps, ...textPropOverrides }
      : { ...componentProps, r: type === "rect" ? componentProps.r : Number };
  return Object.fromEntries(keys.map((key) => [key, definitions[key]]));
}

type NestedShapePropKey = "shape" | "shapeTransition";
type NestedStylePropKey = "style" | "styleTransition";
type SharedPropKey<T extends GraphicComponentType> = Exclude<
  GraphicCommonPropKey,
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
  return defineComponent({
    name,
    inheritAttrs: false,
    props: getRuntimeProps(type) as ComponentProps<T>,
    emits: {} as unknown as GraphicEmits,
    setup(props, { attrs, slots }) {
      const instance = getCurrentInstance()!;
      const collector = inject(GRAPHIC_COLLECTOR_KEY, null);
      const parentIdRef = inject(GRAPHIC_PARENT_ID_KEY, null);

      if (!collector) {
        warn(`\`${name}\` must be used inside \`#graphic\` slot.`);
        return () => null;
      }
      const { register: registerNode, unregister, requestFlush } = collector;
      let currentId: string | null = null;
      let element: HTMLElement | undefined;

      watch([props, () => attrs], () => requestFlush(currentId ?? undefined, instance.uid), {
        deep: true,
      });

      function register(): string {
        const id = resolveIdentity(
          (props as { id?: string | number }).id,
          instance.vnode.key,
          instance.uid,
        );
        if (currentId !== null && currentId !== id) {
          unregister(currentId, instance.uid);
        }
        currentId = id;

        if (element) {
          registerNode({
            id,
            type,
            parentId: parentIdRef!.value,
            element,
            props: props as Record<string, unknown>,
            handlers: { ...attrs },
            sourceId: instance.uid,
          });
        }
        return id;
      }

      const setElement = (value: unknown): void => {
        if (value === element) {
          return;
        }
        element = (value as HTMLElement | null) ?? undefined;
        if (element) {
          register();
        }
      };
      onBeforeUnmount(() => unregister(currentId!, instance.uid));

      if (type === "group") {
        const providedParent = shallowRef<string | null>(null);
        provide(GRAPHIC_PARENT_ID_KEY, providedParent);

        return () => {
          providedParent.value = register();
          const content = (slots as { default?: Slot }).default?.() ?? [];
          return h("div", { ref: setElement }, content);
        };
      }

      return () => {
        register();
        return h("div", { ref: setElement });
      };
    },
  }) as GraphicComponent<T>;
}

export type GraphicComponent<T extends GraphicComponentType> = PublicComponent<
  ComponentProps<T>,
  Record<never, never>,
  GraphicEmits,
  ComponentSlots<T>
>;
