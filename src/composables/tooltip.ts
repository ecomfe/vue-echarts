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

function isTooltipSlot(key: string) {
  return key === "tooltip" || key.startsWith("tooltip-");
}

export function useTooltip(slots: Slots, onSlotsChange: () => void) {
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
            .filter(([key]) => isTooltipSlot(key))
            .map(([key, slot]) => {
              const slotContent = initialized[key]
                ? slot?.({ params: params[key] })
                : undefined;
              return h(
                "div",
                { ref: (el) => (containers[key] = el as HTMLElement) },
                slotContent,
              );
            }),
        )
      : undefined;
  };

  // Shallow clone the option along the path and patch the tooltip formatter
  function patchOption(src: Option): Option {
    const root = { ...src };

    Object.keys(slots)
      .filter((key) => isTooltipSlot(key))
      .forEach((key) => {
        const path = key.split("-");
        path.push(path.shift()!);
        let cur: any = root;

        for (let i = 0; i < path.length; i++) {
          const seg = path[i];
          const next = cur[seg];

          if (i < path.length - 1) {
            // shallow-clone the link; create empty shell if missing
            cur[seg] = next
              ? Array.isArray(next)
                ? [...next]
                : { ...next }
              : isValidArrayIndex(seg)
                ? []
                : {};
            cur = cur[seg];
          } else {
            // final node = tooltip
            cur[seg] = {
              ...(next || {}),
              formatter(p: any) {
                initialized[key] = true;
                params[key] = p;
                return containers[key];
              },
            };
          }
        }
      });

    return root;
  }

  // `slots` is not reactive and cannot be watched
  // so we need to watch it manually
  let slotNames = Object.keys(slots).filter((key) => isTooltipSlot(key));
  onUpdated(() => {
    const newSlotNames = Object.keys(slots).filter((key) => isTooltipSlot(key));
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
