import {
  h,
  Teleport,
  onUpdated,
  onUnmounted,
  onMounted,
  shallowRef,
  shallowReactive,
  type Slots,
} from "vue";
import type { Option } from "../types";
import { isValidArrayIndex } from "../utils";

const SLOT_PATH_MAP = {
  tooltip: ["tooltip", "formatter"],
  dataView: ["toolbox", "feature", "dataView", "optionToContent"],
};
type SlotPrefix = keyof typeof SLOT_PATH_MAP;

function isValidSlotName(key: string) {
  return Object.keys(SLOT_PATH_MAP).some(
    (slotPrefix) => key === slotPrefix || key.startsWith(slotPrefix + "-"),
  );
}

export function useSlotOption(slots: Slots, onSlotsChange: () => void) {
  const detachedRoot =
    typeof window !== "undefined" ? document.createElement("div") : undefined;
  const containers = shallowReactive<Record<string, HTMLElement>>({});
  const initialized = shallowReactive<Record<string, boolean>>({});
  const params = shallowReactive<Record<string, any>>({});
  const isMounted = shallowRef(false);

  // Teleport the tooltip slots to a detached root
  const teleportedSlots = () => {
    // Make tooltip slots client-side only to avoid SSR hydration mismatch
    return isMounted.value
      ? h(
          Teleport as any,
          { to: detachedRoot, defer: true },
          Object.entries(slots)
            .filter(([key]) => isValidSlotName(key))
            .map(([key, slot]) => {
              const propName = key.startsWith("tooltip") ? "params" : "option";
              const slotContent = initialized[key]
                ? slot?.({ [propName]: params[key] })
                : undefined;
              return h(
                "div",
                {
                  ref: (el) => (containers[key] = el as HTMLElement),
                  style: { display: "contents" },
                },
                slotContent,
              );
            }),
        )
      : undefined;
  };

  // Shallow clone the option along the path and override the target callback
  function patchOption(src: Option): Option {
    const root = { ...src };

    Object.keys(slots)
      .filter((key) => isValidSlotName(key))
      .forEach((key) => {
        const path = key.split("-");
        const prefix = path.shift() as SlotPrefix;
        path.push(...SLOT_PATH_MAP[prefix]);

        let cur: any = root;
        for (let i = 0; i < path.length - 1; i++) {
          const seg = path[i];
          const next = cur[seg];

          // shallow-clone the link; create empty shell if missing
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

  // `slots` is not reactive and cannot be watched
  // so we need to watch it manually
  let slotNames: string[] = [];
  onUpdated(() => {
    const newSlotNames = Object.keys(slots).filter((key) => {
      if (isValidSlotName(key)) {
        return true;
      }
      console.warn(`[vue-echarts] Invalid slot name: ${key}`);
      return false;
    });
    if (newSlotNames.join() !== slotNames.join()) {
      // Clean up params and initialized for removed slots
      slotNames.forEach((key) => {
        if (!(key in slots)) {
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
