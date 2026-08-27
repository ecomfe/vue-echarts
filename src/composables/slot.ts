import {
  getCurrentInstance,
  h,
  Teleport,
  onUpdated,
  onMounted,
  shallowRef,
  shallowReactive,
  watchSyncEffect,
} from "vue";
import type { Ref, Slots, SlotsType } from "vue";
import type { Option, UpdateOptions } from "../types";
import { appendReplaceMerge, isPlainObject, isValidArrayIndex, warn } from "../utils";
import type { TooltipComponentFormatterCallbackParams } from "echarts";
import type { VChartSlotsExtension } from "../index";

const SLOT_OPTION_PATHS = {
  tooltip: ["tooltip", "formatter"],
  dataView: ["toolbox", "feature", "dataView", "optionToContent"],
} as const;
const PROTOTYPE_SEGMENT_RE = /-__proto__(?:-|$)/;
type SlotPrefix = keyof typeof SLOT_OPTION_PATHS;
type SlotName = SlotPrefix | `${SlotPrefix}-${string}`;
type SlotMap<T> = Partial<Record<SlotName, T>>;
type SlotFormatter = (payload: unknown) => HTMLElement | undefined;
type SlotState = {
  containers: SlotMap<HTMLElement>;
  params: SlotMap<unknown>;
  formatters: Map<SlotName, SlotFormatter>;
};

function isValidSlotName(key: string): key is SlotName {
  return (
    (key === "tooltip" ||
      key.startsWith("tooltip-") ||
      key === "dataView" ||
      key.startsWith("dataView-")) &&
    !key.endsWith("-") &&
    !key.includes("--") &&
    !PROTOTYPE_SEGMENT_RE.test(key)
  );
}

function getSlotPrefix(key: SlotName): SlotPrefix {
  return key.startsWith("tooltip") ? "tooltip" : "dataView";
}

function getRootComponent(key: SlotName): string | undefined {
  const prefix = getSlotPrefix(key);
  const suffix = key.slice(prefix.length);
  return !suffix || isValidArrayIndex(suffix.slice(1)) ? SLOT_OPTION_PATHS[prefix][0] : undefined;
}

function hasExplicitId(value: unknown): boolean {
  if (!isPlainObject(value)) {
    return false;
  }
  return typeof value.id === "string" || typeof value.id === "number";
}

type Container = Record<string, unknown> | unknown[];

function ensureChild(parent: Container, seg: string, nextSeg?: string): Container | undefined {
  const parentIsArray = Array.isArray(parent);
  if (parentIsArray !== isValidArrayIndex(seg)) {
    return undefined;
  }
  const next = parentIsArray ? parent[Number(seg)] : parent[seg];

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

function writeSegment(parent: Container, seg: string, value: unknown): void {
  if (Array.isArray(parent)) {
    parent[Number(seg)] = value;
    return;
  }
  parent[seg] = value;
}

function writePath(
  root: Option,
  path: readonly string[],
  value: unknown,
  preserveDefined = false,
): boolean {
  let current: Container | undefined = root;
  for (let i = 0; i < path.length - 1; i++) {
    current = ensureChild(current, path[i], path[i + 1]);
    if (!current) {
      return false;
    }
  }
  if (!current || Array.isArray(current)) {
    return false;
  }
  const leaf = path[path.length - 1];
  if (!preserveDefined || current[leaf] === undefined) {
    writeSegment(current, leaf, value);
  }
  return true;
}

export function useSlotOption(slots: Slots, onSlotsChange: () => void, ready: Ref<boolean>) {
  const instance = getCurrentInstance()!;
  let detachedRoot: HTMLDivElement | undefined;
  let state: SlotState | undefined;
  const isMounted = shallowRef(false);
  const warnedInvalidSlots = new Set<string>();

  const getState = (): SlotState =>
    (state ??= {
      containers: shallowReactive<SlotMap<HTMLElement>>({}),
      params: shallowReactive<SlotMap<unknown>>({}),
      formatters: new Map<SlotName, SlotFormatter>(),
    });

  const collectSlotNames = (): SlotName[] => {
    const names: SlotName[] = [];
    for (const key in slots) {
      if (key === "graphic") {
        continue;
      }
      if (isValidSlotName(key)) {
        names.push(key);
      } else if (!warnedInvalidSlots.has(key)) {
        warn(`Invalid slot name: ${key}`);
        warnedInvalidSlots.add(key);
      }
    }
    return names;
  };

  let slotNames: readonly SlotName[] = [];
  let nextSlotNames = slotNames;
  let appliedSlotNames = slotNames;
  let patchedSlotNames = slotNames;
  let rebuildOnRemoval = false;

  const hasNewSlots = () => collectSlotNames().some((name) => !slotNames.includes(name));

  watchSyncEffect(() => {
    if (!ready.value) {
      appliedSlotNames = patchedSlotNames = [];
      rebuildOnRemoval = false;
      if (state) {
        for (const key of Object.keys(state.params) as SlotName[]) {
          delete state.params[key];
        }
      }
    }
  });

  function syncSlotNames(names: readonly SlotName[]): boolean {
    let changed = names.length !== slotNames.length;
    for (let i = 0; !changed && i < slotNames.length; i++) {
      changed = !names.includes(slotNames[i]);
    }
    if (!changed) {
      return false;
    }

    for (const key of slotNames) {
      if (!names.includes(key)) {
        if (state) {
          delete state.params[key];
          delete state.containers[key];
          state.formatters.delete(key);
        }
      }
    }
    slotNames = names;
    return true;
  }

  const render = () => {
    nextSlotNames = collectSlotNames();
    if (nextSlotNames.length === 0 || !ready.value || !isMounted.value) {
      return undefined;
    }
    const ownerDocument = (instance.vnode.el as HTMLElement).ownerDocument;
    detachedRoot ??= ownerDocument.createElement("div");
    const { containers, params } = getState();

    return h(
      Teleport,
      { to: detachedRoot },
      nextSlotNames.map((slotName) => {
        const slot = slots[slotName];
        const slotContent = slotName in params ? slot?.(params[slotName]) : undefined;
        return h(
          "div",
          {
            key: slotName,
            ref: (el) => {
              if (el) {
                containers[slotName] = el as HTMLElement;
              } else {
                delete containers[slotName];
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
    rebuildOnRemoval = false;
    const names = collectSlotNames();
    syncSlotNames(names);
    let root: Option | undefined;

    for (const key of appliedSlotNames) {
      if (names.includes(key)) {
        continue;
      }
      const replacement = getRootComponent(key);
      if (!replacement) {
        continue;
      }
      const prefix = getSlotPrefix(key);
      const component = (src as Record<string, unknown>)[replacement];
      if (key !== prefix) {
        if (Array.isArray(component) && component.some(hasExplicitId)) {
          rebuildOnRemoval = true;
        }
        continue;
      }
      const path = SLOT_OPTION_PATHS[prefix];
      if (hasExplicitId(component)) {
        root ??= { ...src };
        writePath(root, path, null, true);
      }
    }

    if (names.length === 0) {
      patchedSlotNames = [];
      return root ?? src;
    }
    const { formatters, params, containers } = getState();
    root ??= { ...src };
    const patchedNames: SlotName[] = [];

    for (const key of names) {
      let formatter = formatters.get(key);
      if (!formatter) {
        formatter = (payload: unknown): HTMLElement | undefined => {
          if (!ready.value || !slots[key]) {
            return undefined;
          }
          // ECharts may update and reuse the same formatter payload object.
          if (key in params && Object.is(params[key], payload)) {
            delete params[key];
          }
          params[key] = payload;
          return containers[key];
        };
        formatters.set(key, formatter);
      }

      const prefix = getSlotPrefix(key);
      const rest = key.slice(prefix.length);
      const path = rest ? rest.slice(1).split("-") : [];
      const target = SLOT_OPTION_PATHS[prefix];
      if (isValidArrayIndex(path[0] ?? "")) {
        const index = path.shift()!;
        path.push(target[0], index, ...target.slice(1));
      } else {
        path.push(...target);
      }

      if (!writePath(root, path, formatter)) {
        continue;
      }
      patchedNames.push(key);
    }

    patchedSlotNames = patchedNames;
    return root;
  }

  function patchUpdateOptions(updateOptions?: UpdateOptions): UpdateOptions | undefined {
    // ECharts merge retains formatter fields omitted after a slot is removed.
    const replacements = new Set<string>();
    for (const key of appliedSlotNames) {
      if (patchedSlotNames.includes(key)) {
        continue;
      }
      const replacement = getRootComponent(key);
      if (!replacement || rebuildOnRemoval) {
        return { ...updateOptions, notMerge: true };
      }
      replacements.add(replacement);
    }
    for (const replacement of replacements) {
      updateOptions = appendReplaceMerge(updateOptions, replacement);
    }
    return updateOptions;
  }

  function commitOption(): void {
    appliedSlotNames = patchedSlotNames;
  }

  onUpdated(() => {
    if (syncSlotNames(nextSlotNames)) {
      onSlotsChange();
    }
  });

  onMounted(() => {
    slotNames = nextSlotNames;
    isMounted.value = true;
  });

  return {
    render,
    hasNewSlots,
    patchOption,
    patchUpdateOptions,
    commitOption,
  };
}

export type SlotsTypes = SlotsType<
  Record<"tooltip" | `tooltip-${string}`, TooltipComponentFormatterCallbackParams> &
    Record<"dataView" | `dataView-${string}`, Option> &
    VChartSlotsExtension
>;
