import {
  h,
  Teleport,
  onUpdated,
  onUnmounted,
  onMounted,
  shallowRef,
  shallowReactive,
} from "vue";
import type { Slots, SlotsType } from "vue";
import type { Option } from "../types";
import { isBrowser, isValidArrayIndex, isSameSet, warn } from "../utils";
import type { TooltipComponentFormatterCallbackParams } from "echarts";

const SLOT_OPTION_PATHS = {
  tooltip: ["tooltip", "formatter"],
  dataView: ["toolbox", "feature", "dataView", "optionToContent"],
} as const;
type SlotPrefix = keyof typeof SLOT_OPTION_PATHS;
type SlotName = SlotPrefix | `${SlotPrefix}-${string}`;
type SlotRecord<T> = Partial<Record<SlotName, T>>;
const SLOT_PREFIXES = Object.keys(SLOT_OPTION_PATHS) as SlotPrefix[];

function isValidSlotName(key: string): key is SlotName {
  return SLOT_PREFIXES.some(
    (slotPrefix) => key === slotPrefix || key.startsWith(slotPrefix + "-"),
  );
}

export function useSlotOption(slots: Slots, onSlotsChange: () => void) {
  const detachedRoot = isBrowser() ? document.createElement("div") : undefined;
  const containers = shallowReactive<SlotRecord<HTMLElement>>({});
  const initialized = shallowReactive<SlotRecord<boolean>>({});
  const params = shallowReactive<SlotRecord<unknown>>({});
  const isMounted = shallowRef(false);

  // Teleport the slots to a detached root
  const teleportedSlots = () => {
    // Make slots client-side only to avoid SSR hydration mismatch
    return isMounted.value && detachedRoot
      ? h(
          Teleport,
          { to: detachedRoot },
          Object.entries(slots)
            .filter(([key]) => isValidSlotName(key))
            .map(([key, slot]) => {
              const slotName = key as SlotName;
              const slotContent = initialized[slotName]
                ? slot?.(params[slotName])
                : undefined;
              return h(
                "div",
                {
                  ref: (el) => {
                    if (el instanceof HTMLElement) {
                      containers[slotName] = el;
                    }
                  },
                  style: { display: "contents" },
                },
                slotContent,
              );
            }),
        )
      : undefined;
  };

  // Helper to check if a value is a plain object
  function isObject(val: unknown): val is Record<string, unknown> {
    return val !== null && typeof val === "object" && !Array.isArray(val);
  }

  // Shallow-clone the option along each path and override the target callback
  function patchOption(src: Option): Option {
    const root = { ...src } as Record<string, unknown>;

    // Ensure the child at `seg` is a writable container (cloned or newly created).
    // Returns the child container, or undefined if traversal is blocked by a primitive.
    const ensureChild = (
      parent: Record<string, unknown>,
      seg: string,
    ): Record<string, unknown> | undefined => {
      const next = parent[seg];

      if (Array.isArray(next)) {
        parent[seg] = [...next];
        return parent[seg] as Record<string, unknown>;
      }
      if (isObject(next)) {
        parent[seg] = { ...next };
        return parent[seg] as Record<string, unknown>;
      }
      if (next === undefined) {
        parent[seg] = isValidArrayIndex(seg) ? [] : {};
        return parent[seg] as Record<string, unknown>;
      }
      // Blocked by a non-container value
      return undefined;
    };

    Object.keys(slots)
      .filter((key) => {
        const valid = isValidSlotName(key);
        if (!valid) {
          warn(`Invalid slot name: ${key}`);
        }
        return valid;
      })
      .forEach((key) => {
        const [prefix, ...rest] = key.split("-") as [SlotPrefix, ...string[]];
        const tail = SLOT_OPTION_PATHS[prefix];
        const path = [...rest, ...tail];

        // Traverse to the parent of the leaf, cloning or creating along the way
        let cur: Record<string, unknown> | undefined = root;
        for (let i = 0; i < path.length - 1; i++) {
          cur = ensureChild(cur, path[i]);
          if (!cur) {
            return; // Blocked by a primitive — skip this key
          }
        }

        cur[path[path.length - 1]] = (p: unknown) => {
          initialized[key] = true;
          params[key] = p;
          return containers[key];
        };
      });

    return root as Option;
  }

  // `slots` is not reactive, so we need to watch it manually
  let slotNames: SlotName[] = [];
  onUpdated(() => {
    const newSlotNames = Object.keys(slots).filter(isValidSlotName);
    if (!isSameSet(newSlotNames, slotNames)) {
      // Clean up states for removed slots
      slotNames.forEach((key) => {
        if (!newSlotNames.includes(key)) {
          delete params[key];
          delete initialized[key];
          delete containers[key];
        }
      });
      slotNames = newSlotNames;
      onSlotsChange();
    }
  });

  onMounted(() => {
    isMounted.value = true;
  });

  onUnmounted(() => {
    detachedRoot?.remove();
  });

  return {
    teleportedSlots,
    patchOption,
  };
}

export type SlotsTypes = SlotsType<
  Record<
    "tooltip" | `tooltip-${string}`,
    TooltipComponentFormatterCallbackParams
  > &
    Record<"dataView" | `dataView-${string}`, Option>
>;
