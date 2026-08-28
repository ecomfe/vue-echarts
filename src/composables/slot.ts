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
import type { Option } from "../types";
import { isPlainObject, isValidArrayIndex, warn } from "../utils";
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

function getSlotPath(key: SlotName): string[] {
  const prefix: SlotPrefix = key.startsWith("tooltip") ? "tooltip" : "dataView";
  const rest = key.slice(prefix.length);
  const path = rest ? rest.slice(1).split("-") : [];
  const target = SLOT_OPTION_PATHS[prefix];
  if (isValidArrayIndex(path[0] ?? "")) {
    const index = path.shift()!;
    path.push(target[0], index, ...target.slice(1));
  } else {
    path.push(...target);
  }
  return path;
}

type Container = Record<string, unknown> | unknown[];

function ensureChild(parent: Container, seg: string, nextSeg: string): Container | undefined {
  const parentIsArray = Array.isArray(parent);
  if (parentIsArray !== isValidArrayIndex(seg)) {
    return undefined;
  }
  const next = parentIsArray ? parent[Number(seg)] : parent[seg];

  let child: Container;
  if (Array.isArray(next)) {
    child = [...next];
  } else if (isPlainObject(next)) {
    child = { ...next };
  } else if (next === undefined && !parentIsArray && !isValidArrayIndex(nextSeg)) {
    child = {};
  } else {
    return undefined;
  }
  writeSegment(parent, seg, child);
  return child;
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
  let current: Container = root;
  for (let i = 0; i < path.length - 1; i++) {
    const child = ensureChild(current, path[i], path[i + 1]);
    if (!child) {
      return false;
    }
    current = child;
  }
  if (Array.isArray(current)) {
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
  const containers = shallowReactive<SlotMap<HTMLElement>>({});
  const params = shallowReactive<SlotMap<unknown>>({});
  const isMounted = shallowRef(false);

  const collectSlotNames = (warnInvalid = false): SlotName[] => {
    const names: SlotName[] = [];
    for (const key in slots) {
      if (key === "graphic") {
        continue;
      }
      if (isValidSlotName(key)) {
        names.push(key);
      } else if (warnInvalid) {
        warn(`Invalid slot name: ${key}`);
      }
    }
    return names;
  };
  collectSlotNames(true);

  let slotNames: readonly SlotName[] = [];
  let nextSlotNames = slotNames;
  let patchedSlotNames = slotNames;

  const hasNewSlots = () => collectSlotNames().some((name) => !slotNames.includes(name));

  watchSyncEffect(() => {
    if (!ready.value) {
      patchedSlotNames = [];
      for (const key of Object.keys(params) as SlotName[]) {
        delete params[key];
      }
    }
  });

  function syncSlotNames(names: readonly SlotName[]): boolean {
    if (names.length === slotNames.length && slotNames.every((name) => names.includes(name))) {
      return false;
    }

    for (const key of slotNames) {
      if (!names.includes(key)) {
        delete params[key];
        delete containers[key];
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
    const names = collectSlotNames();
    syncSlotNames(names);
    let root: Option | undefined;

    for (const key of patchedSlotNames) {
      if (!names.includes(key)) {
        root ??= { ...src };
        writePath(root, getSlotPath(key), null, true);
      }
    }

    if (names.length === 0) {
      patchedSlotNames = [];
      return root ?? src;
    }
    root ??= { ...src };
    const patchedNames: SlotName[] = [];

    for (const key of names) {
      const formatter = (payload: unknown): HTMLElement | undefined => {
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

      if (!writePath(root, getSlotPath(key), formatter)) {
        continue;
      }
      patchedNames.push(key);
    }

    patchedSlotNames = patchedNames;
    return root;
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
  };
}

export type SlotsTypes = SlotsType<
  Record<"tooltip" | `tooltip-${string}`, TooltipComponentFormatterCallbackParams> &
    Record<"dataView" | `dataView-${string}`, Option> &
    VChartSlotsExtension
>;
