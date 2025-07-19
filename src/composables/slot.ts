import {
  h,
  Teleport,
  onUpdated,
  onUnmounted,
  onMounted,
  shallowRef,
  shallowReactive,
  warn,
} from "vue";
import type { Slots } from "vue";
import type { Option } from "../types";
import { isValidArrayIndex, isSameSet } from "../utils";

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
  const detachedRoot =
    typeof window !== "undefined" ? document.createElement("div") : undefined;
  const containers = shallowReactive<SlotRecord<HTMLElement>>({});
  const initialized = shallowReactive<SlotRecord<boolean>>({});
  const params = shallowReactive<SlotRecord<Record<string, any>>>({});
  const isMounted = shallowRef(false);

  // Teleport the slots to a detached root
  const teleportedSlots = () => {
    // Make slots client-side only to avoid SSR hydration mismatch
    return isMounted.value
      ? h(
          Teleport as any,
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
                  ref: (el) => (containers[slotName] = el as HTMLElement),
                  style: { display: "contents" },
                },
                slotContent,
              );
            }),
        )
      : undefined;
  };

  // Shallow-clone the option along the path and override the target callback
  function patchOption(src: Option): Option {
    const root = { ...src };

    Object.keys(slots)
      .filter((key) => {
        const isValidSlot = isValidSlotName(key);
        if (!isValidSlot) {
          warn(`Invalid vue-echarts slot name: ${key}`);
        }
        return isValidSlot;
      })
      .forEach((key) => {
        const path = key.split("-");
        const prefix = path.shift() as SlotPrefix;
        path.push(...SLOT_OPTION_PATHS[prefix]);

        let cur: any = root;
        for (let i = 0; i < path.length - 1; i++) {
          const seg = path[i];
          const next = cur[seg];

          // Shallow-clone the link; create empty shell if missing
          cur[seg] = next
            ? Array.isArray(next)
              ? [...next]
              : { ...next }
            : isValidArrayIndex(seg)
              ? []
              : {};
          cur = cur[seg];
        }
        cur[path[path.length - 1]] = (p: any) => {
          initialized[key] = true;
          params[key] = p;
          return containers[key];
        };
      });

    return root;
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
