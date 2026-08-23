import {
  getCurrentInstance,
  h,
  Teleport,
  onUpdated,
  onMounted,
  shallowRef,
  shallowReactive,
} from "vue";
import type { Slots, SlotsType } from "vue";
import type { Option, UpdateOptions } from "../types";
import { isPlainObject, isValidArrayIndex, warn } from "../utils";
import type { TooltipComponentFormatterCallbackParams } from "echarts";
import type { VChartSlotsExtension } from "../index";

const SLOT_OPTION_PATHS = {
  tooltip: ["tooltip", "formatter"],
  dataView: ["toolbox", "feature", "dataView", "optionToContent"],
} as const;
type SlotPrefix = keyof typeof SLOT_OPTION_PATHS;
type SlotName = SlotPrefix | `${SlotPrefix}-${string}`;
const EMPTY_SLOT_NAMES: readonly SlotName[] = [];
type SlotMap<T> = Partial<Record<SlotName, T>>;
type SlotBinding = {
  path: string[];
  formatter: (payload: unknown) => HTMLElement | undefined;
};
type SlotState = {
  containers: SlotMap<HTMLElement>;
  initialized: SlotMap<boolean>;
  params: SlotMap<unknown>;
  bindings: Map<SlotName, SlotBinding>;
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
  const instance = getCurrentInstance()!;
  let detachedRoot: HTMLDivElement | undefined;
  let state: SlotState | undefined;
  const isMounted = shallowRef(false);
  let warnedInvalidSlots: Set<string> | undefined;

  const getState = (): SlotState =>
    (state ??= {
      containers: shallowReactive<SlotMap<HTMLElement>>({}),
      initialized: shallowReactive<SlotMap<boolean>>({}),
      params: shallowReactive<SlotMap<unknown>>({}),
      bindings: new Map<SlotName, SlotBinding>(),
    });

  const collectSlotNames = (warnInvalid: boolean): readonly SlotName[] => {
    let result: SlotName[] | undefined;
    for (const key in slots) {
      if (key === "graphic") {
        continue;
      }
      if (isValidSlotName(key)) {
        (result ??= []).push(key);
      } else if (warnInvalid && !warnedInvalidSlots?.has(key)) {
        warn(`Invalid slot name: ${key}`);
        (warnedInvalidSlots ??= new Set()).add(key);
      }
    }
    return result ?? EMPTY_SLOT_NAMES;
  };

  let slotNames = collectSlotNames(false);

  const render = () => {
    const names = collectSlotNames(false);
    if (names.length === 0 || !isMounted.value) {
      return undefined;
    }
    const ownerDocument = (instance.vnode.el as HTMLElement).ownerDocument;
    detachedRoot ??= ownerDocument.createElement("div");
    const { containers, initialized, params } = getState();

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
              if (el) {
                containers[slotName] = el as HTMLElement;
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
    const { bindings, initialized, params, containers } = getState();
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
    if (slotNames.length === 0) {
      if (nextSlotNames.length > 0) {
        slotNames = nextSlotNames;
        onSlotsChange();
      }
      return;
    }

    const nextSlotNameSet = new Set(nextSlotNames);
    let removed = false;
    for (const key of slotNames) {
      if (!nextSlotNameSet.has(key)) {
        removed = true;
        if (state) {
          delete state.params[key];
          delete state.initialized[key];
          delete state.containers[key];
          state.bindings.delete(key);
        }
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
