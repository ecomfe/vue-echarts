import {
  h,
  Teleport,
  onUpdated,
  onUnmounted,
  shallowReactive,
  type Slots,
} from "vue";
import { parseProperties } from "../utils";
import type { Option } from "src/types";

function isTooltipSlot(key: string) {
  return key === "tooltip" || key.startsWith("tooltip:");
}

export function useTooltip(slots: Slots, onSlotsChange?: () => void) {
  const detachedRoot = document?.createElement("div");
  const containers = shallowReactive<Record<string, HTMLElement>>({});
  const initialized = shallowReactive<Record<string, boolean>>({});
  const params = shallowReactive<Record<string, any>>({});

  // Teleport the tooltip slots to a detached root
  const teleportedSlots = () => {
    return h(
      Teleport as any,
      { to: detachedRoot },
      Object.entries(slots)
        .filter(([key]) => isTooltipSlot(key))
        .map(([key, slot]) => {
          const slotContent = initialized[key]
            ? slot?.({ params: params[key] })
            : undefined;
          return h(
            "div",
            { ref: (el) => (containers[key] = el as HTMLElement), name: key },
            slotContent,
          );
        }),
    );
  };

  // Create a minimal option with component rendered tooltip formatter
  function createTooltipOption(): Option {
    const option: any = {};

    Object.keys(slots)
      .filter((key) => isTooltipSlot(key))
      .forEach((key) => {
        const path =
          key === "tooltip" ? [] : parseProperties(key.replace("tooltip:", ""));
        let current = option;
        path.forEach((k) => {
          if (!(k in current)) {
            // If the key is a number, create an array, otherwise create an object
            current[k] = isNaN(Number(k)) ? {} : [];
          }
          current = current[k];
        });
        current.tooltip = {
          formatter(p: any) {
            initialized[key] = true;
            params[key] = p;
            return containers[key];
          },
        };
      });

    return option;
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
      onSlotsChange?.();
    }
  });

  onUnmounted(() => {
    detachedRoot?.remove();
  });

  return {
    teleportedSlots,
    createTooltipOption,
  };
}
