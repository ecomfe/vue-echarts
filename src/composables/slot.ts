import { h, Teleport, onUpdated, onUnmounted, onMounted, shallowRef, shallowReactive } from "vue";
import type { Slots, SlotsType } from "vue";
import type { Option } from "../types";
import { isBrowser, isPlainObject, isValidArrayIndex, isSameSet, warn } from "../utils";
import type { TooltipComponentFormatterCallbackParams } from "echarts";
import type { VChartSlotsExtension } from "../slots";

const SLOT_OPTION_PATHS = {
  tooltip: ["tooltip", "formatter"],
  dataView: ["toolbox", "feature", "dataView", "optionToContent"],
} as const;
type SlotPrefix = keyof typeof SLOT_OPTION_PATHS;
type SlotName = SlotPrefix | `${SlotPrefix}-${string}`;
type SlotRecord<T> = Partial<Record<SlotName, T>>;
const SLOT_PREFIXES: SlotPrefix[] = ["tooltip", "dataView"];

function isValidSlotName(key: string): key is SlotName {
  return SLOT_PREFIXES.some((slotPrefix) => key === slotPrefix || key.startsWith(slotPrefix + "-"));
}

type Container = Record<string, unknown> | unknown[];

function ensureChild(parent: Container, seg: string, nextSeg?: string): Container | undefined {
  const next = readSegment(parent, seg);

  if (Array.isArray(next)) {
    const cloned = [...next];
    writeSegment(parent, seg, cloned);
    return cloned;
  }
  if (isPlainObject(next)) {
    const cloned: Record<string, unknown> = { ...next };
    writeSegment(parent, seg, cloned);
    return cloned;
  }
  if (next === undefined) {
    const created = nextSeg && isValidArrayIndex(nextSeg) ? [] : {};
    writeSegment(parent, seg, created);
    return created;
  }
  // Blocked by a non-container value
  return undefined;
}

function readSegment(parent: Container, seg: string): unknown {
  if (Array.isArray(parent)) {
    return parent[Number(seg)];
  }
  return parent[seg];
}

function writeSegment(parent: Container, seg: string, value: unknown): void {
  if (Array.isArray(parent)) {
    parent[Number(seg)] = value;
    return;
  }
  parent[seg] = value;
}

export function useSlotOption(slots: Slots, onSlotsChange: () => void) {
  const detachedRoot = isBrowser() ? document.createElement("div") : undefined;
  const containers = shallowReactive<SlotRecord<HTMLElement>>({});
  const initialized = shallowReactive<SlotRecord<boolean>>({});
  const params = shallowReactive<SlotRecord<unknown>>({});
  const isMounted = shallowRef(false);
  const warnedInvalidSlots = new Set<string>();

  const collectSlotNames = (warnInvalid: boolean): SlotName[] => {
    const result: SlotName[] = [];
    for (const key of Object.keys(slots)) {
      if (key === "graphic") {
        continue;
      }
      if (isValidSlotName(key)) {
        result.push(key);
      } else if (warnInvalid && !warnedInvalidSlots.has(key)) {
        warn(`Invalid slot name: ${key}`);
        warnedInvalidSlots.add(key);
      }
    }
    return result;
  };

  let slotNames = collectSlotNames(false);

  // Teleport the slots to a detached root
  const teleportedSlots = () => {
    const names = collectSlotNames(false);
    // Make slots client-side only to avoid SSR hydration mismatch
    return isMounted.value && detachedRoot
      ? h(
          Teleport,
          { to: detachedRoot },
          names.map((slotName) => {
            const slot = slots[slotName];
            const slotContent = initialized[slotName] ? slot?.(params[slotName]) : undefined;
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

  // Shallow-clone the option along each path and override the target callback
  function patchOption(src: Option): Option {
    const root: Option = { ...src };
    const names = collectSlotNames(true);

    names.forEach((key) => {
      const prefix: SlotPrefix = key.startsWith("tooltip") ? "tooltip" : "dataView";
      const rest = key.slice(prefix.length);
      const parts = rest ? rest.slice(1).split("-") : [];
      const tail = SLOT_OPTION_PATHS[prefix];
      const path = [...parts, ...tail];

      // Traverse to the parent of the leaf, cloning or creating along the way
      let cur: Container | undefined = root;
      for (let i = 0; i < path.length - 1; i++) {
        cur = ensureChild(cur, path[i], path[i + 1]);
        if (!cur) {
          return; // Blocked by a primitive — skip this key
        }
      }

      const leaf = path[path.length - 1];
      const formatter = (p: unknown) => {
        initialized[key] = true;
        params[key] = p;
        return containers[key];
      };
      writeSegment(cur, leaf, formatter);
    });

    return root;
  }

  // `slots` is not reactive, so we need to watch it manually
  onUpdated(() => {
    const newSlotNames = collectSlotNames(false);
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
  Record<"tooltip" | `tooltip-${string}`, TooltipComponentFormatterCallbackParams> &
    Record<"dataView" | `dataView-${string}`, Option> &
    VChartSlotsExtension
>;
