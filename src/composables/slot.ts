import { h, Teleport, onUpdated, onUnmounted, onMounted, shallowRef, shallowReactive } from "vue";
import type { Slots, SlotsType } from "vue";
import type { Option } from "../types";
import { isBrowser, isPlainObject, isSameSet, isValidArrayIndex, warn } from "../utils";
import type { TooltipComponentFormatterCallbackParams } from "echarts";
import type { VChartSlotsExtension } from "../index";

const SLOT_OPTION_PATHS = {
  tooltip: ["tooltip", "formatter"],
  dataView: ["toolbox", "feature", "dataView", "optionToContent"],
} as const;
type SlotPrefix = keyof typeof SLOT_OPTION_PATHS;
type SlotName = SlotPrefix | `${SlotPrefix}-${string}`;
type SlotContainerMap = Partial<Record<SlotName, HTMLElement>>;
type SlotInitMap = Partial<Record<SlotName, boolean>>;
type SlotParamMap = Partial<Record<SlotName, unknown>>;
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
  const containers = shallowReactive<SlotContainerMap>({});
  const initialized = shallowReactive<SlotInitMap>({});
  const params = shallowReactive<SlotParamMap>({});
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

  const render = () => {
    const names = collectSlotNames(false);
    if (names.length === 0 || !isMounted.value || !detachedRoot) {
      return undefined;
    }

    return h(
      Teleport,
      { to: detachedRoot },
      names.map((slotName) => {
        const slot = slots[slotName];
        const slotContent = initialized[slotName] ? slot?.(params[slotName]) : undefined;
        return h(
          "div",
          {
            key: slotName,
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
    );
  };

  function patchOption(src: Option): Option {
    const root: Option = { ...src };
    const names = collectSlotNames(true);

    for (const key of names) {
      const prefix: SlotPrefix = key.startsWith("tooltip") ? "tooltip" : "dataView";
      const rest = key.slice(prefix.length);
      const parts = rest ? rest.slice(1).split("-") : [];
      const tail = SLOT_OPTION_PATHS[prefix];
      const path = [...parts, ...tail];

      let current: Container | undefined = root;
      for (let i = 0; i < path.length - 1; i++) {
        current = ensureChild(current, path[i], path[i + 1]);
        if (!current) {
          break;
        }
      }
      if (!current) {
        continue;
      }

      const leaf = path[path.length - 1];
      const formatter = (payload: unknown): HTMLElement | undefined => {
        initialized[key] = true;
        params[key] = payload;
        return containers[key];
      };
      writeSegment(current, leaf, formatter);
    }

    return root;
  }

  onUpdated(() => {
    const nextSlotNames = collectSlotNames(false);
    if (!isSameSet(nextSlotNames, slotNames)) {
      const nextSlotNameSet = new Set(nextSlotNames);
      for (const key of slotNames) {
        if (!nextSlotNameSet.has(key)) {
          delete params[key];
          delete initialized[key];
          delete containers[key];
        }
      }
      slotNames = nextSlotNames;
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
    render,
    patchOption,
  };
}

export type SlotsTypes = SlotsType<
  Record<"tooltip" | `tooltip-${string}`, TooltipComponentFormatterCallbackParams> &
    Record<"dataView" | `dataView-${string}`, Option> &
    VChartSlotsExtension
>;
