import { h, Teleport, onUpdated, onMounted, shallowRef, shallowReactive } from "vue";
import type { Slots, SlotsType } from "vue";
import type { Option, UpdateOptions } from "../types";
import { isBrowser, isPlainObject, isValidArrayIndex, warn } from "../utils";
import type { TooltipComponentFormatterCallbackParams } from "echarts";
import type { VChartSlotsExtension } from "../index";

const SLOT_OPTION_PATHS = {
  tooltip: ["tooltip", "formatter"],
  dataView: ["toolbox", "feature", "dataView", "optionToContent"],
} as const;
type SlotPrefix = keyof typeof SLOT_OPTION_PATHS;
type SlotName = SlotPrefix | `${SlotPrefix}-${string}`;
type SlotMap<T> = Partial<Record<SlotName, T>>;
type SlotBinding = {
  path: string[];
  formatter: (payload: unknown) => HTMLElement | undefined;
};

function isValidSlotName(key: string): key is SlotName {
  if (key.endsWith("-") || key.includes("--")) {
    return false;
  }
  return (
    key === "tooltip" ||
    key.startsWith("tooltip-") ||
    key === "dataView" ||
    key.startsWith("dataView-")
  );
}

type Container = Record<string, unknown> | unknown[];

function ensureChild(parent: Container, seg: string, nextSeg?: string): Container | undefined {
  if (Array.isArray(parent) && !isValidArrayIndex(seg)) {
    return undefined;
  }
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

export function useSlotOption(slots: Slots, onSlotsChange: (options?: UpdateOptions) => void) {
  const detachedRoot = isBrowser() ? document.createElement("div") : undefined;
  const containers = shallowReactive<SlotMap<HTMLElement>>({});
  const initialized = shallowReactive<SlotMap<boolean>>({});
  const params = shallowReactive<SlotMap<unknown>>({});
  const bindings = new Map<SlotName, SlotBinding>();
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
    const names = collectSlotNames(true);
    if (names.length === 0) {
      return src;
    }
    const root: Option = { ...src };

    for (const key of names) {
      let binding = bindings.get(key);
      if (!binding) {
        const prefix: SlotPrefix = key.startsWith("tooltip") ? "tooltip" : "dataView";
        const rest = key.slice(prefix.length);
        const parts = rest ? rest.slice(1).split("-") : [];
        binding = {
          path: [...parts, ...SLOT_OPTION_PATHS[prefix]],
          formatter: (payload: unknown): HTMLElement | undefined => {
            if (!slots[key]) {
              return undefined;
            }
            initialized[key] = true;
            params[key] = payload;
            return containers[key];
          },
        };
        bindings.set(key, binding);
      }

      const { path, formatter } = binding;

      let current: Container | undefined = root;
      for (let i = 0; i < path.length - 1; i++) {
        current = ensureChild(current, path[i], path[i + 1]);
        if (!current) {
          break;
        }
      }
      if (!current || Array.isArray(current)) {
        continue;
      }

      const leaf = path[path.length - 1];
      writeSegment(current, leaf, formatter);
    }

    return root;
  }

  onUpdated(() => {
    const nextSlotNames = collectSlotNames(false);
    const nextSlotNameSet = new Set(nextSlotNames);
    let removed = false;
    for (const key of slotNames) {
      if (!nextSlotNameSet.has(key)) {
        removed = true;
        delete params[key];
        delete initialized[key];
        delete containers[key];
        bindings.delete(key);
      }
    }

    if (removed || nextSlotNames.length !== slotNames.length) {
      slotNames = nextSlotNames;
      // ECharts merge retains formatter fields omitted after a slot is removed.
      onSlotsChange(removed ? { notMerge: true } : undefined);
    }
  });

  onMounted(() => {
    isMounted.value = true;
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
