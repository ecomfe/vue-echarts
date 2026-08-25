import { ComponentModel } from "echarts/core";

import type { Option } from "./types";
import { isPlainObject } from "./utils";

export interface UpdatePlan {
  notMerge: boolean;
  replaceMerge?: string[];
}

interface ObjectShape {
  [key: string]: Shape | undefined;
}
type Shape = true | ObjectShape | ArraySummary;
type ArrayItemShape = {
  id: string | undefined;
  name: string | undefined;
  shape: Shape;
};
type ShapeMode = "option" | "media";
const EMPTY_IDS: ReadonlySet<string> = new Set();

function toIdentity(value: unknown): string | undefined {
  return typeof value === "string" || typeof value === "number" ? String(value) : undefined;
}

function isComponentOption(value: unknown): boolean {
  return typeof value === "function" || (typeof value === "object" && value !== null);
}

/** Structural summary of an array option for deletion detection. */
export interface ArraySummary {
  /** Unique ids used to match component items; empty for positional arrays. */
  ids: ReadonlySet<string>;
  /** Anonymous component items, or all items in a positional array. */
  noIdCount: number;
  /** Structural snapshots in merge order; invalid component entries are omitted. */
  shapes: ArrayItemShape[];
}

/** Minimal signature of an option used to decide setOption behavior. */
export interface Signature {
  /** Map of array-typed top-level keys to their summaries. */
  arrays: Record<string, ArraySummary | undefined>;
  /** Structural snapshots used to detect nested property removal without retaining option values. */
  objectShapes: Record<string, Shape | undefined>;
  /** Sorted top-level keys whose values are not traversed. */
  leaves: string[];
}

export interface PlannedUpdate {
  signature: Signature;
  plan: UpdatePlan;
}

function buildShape(
  value: unknown,
  stack: WeakSet<object>,
  mode?: ShapeMode,
  itemShape?: ArrayItemShape,
): true | ObjectShape {
  if (!isPlainObject(value)) {
    return true;
  }

  const rawId = itemShape ? value.id : undefined;
  const rawName = itemShape ? value.name : undefined;
  if (itemShape) {
    itemShape.id = toIdentity(rawId);
    itemShape.name = toIdentity(rawName);
  }
  if (stack.has(value)) {
    return true;
  }

  stack.add(value);
  const shape: ObjectShape = Object.create(null);
  for (const key of Object.keys(value)) {
    const child =
      itemShape && key === "id" ? rawId : itemShape && key === "name" ? rawName : value[key];
    if (child === undefined) {
      continue;
    }
    shape[key] =
      mode === "option" && Array.isArray(child)
        ? analyzeArray(child, stack, undefined, ComponentModel.hasClass(key))
        : mode === "media" && key === "option"
          ? buildShape(child, stack, "option")
          : buildShape(child, stack);
  }
  stack.delete(value);
  return shape;
}

function analyzeArray(
  items: unknown[],
  stack: WeakSet<object>,
  mode: ShapeMode | undefined,
  componentItems: boolean,
): ArraySummary {
  let ids: Set<string> | undefined;
  let noIdCount = 0;
  const shapes: ArrayItemShape[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (componentItems && !isComponentOption(item)) {
      continue;
    }
    const itemShape: ArrayItemShape = { id: undefined, name: undefined, shape: true };
    itemShape.shape = buildShape(item, stack, mode, componentItems ? itemShape : undefined);
    shapes.push(itemShape);
    if (itemShape.id === undefined) {
      noIdCount++;
      continue;
    }
    (ids ??= new Set()).add(itemShape.id);
  }

  return {
    ids: ids ?? EMPTY_IDS,
    noIdCount,
    shapes,
  };
}

/**
 * Build a structural signature that retains component identities but not option payload values.
 * Arrays inside component items remain leaves to avoid traversing chart data. Nested option units
 * (`baseOption`, timeline options, and media options) reuse summaries for their component arrays.
 */
export function buildSignature(option: Option): Signature {
  const opt = option as Record<string, unknown>;

  let stack: WeakSet<object> | undefined;
  const arrays: Record<string, ArraySummary | undefined> = Object.create(null);
  const objectShapes: Record<string, Shape | undefined> = Object.create(null);
  const leaves: string[] = [];

  for (const key of Object.keys(opt)) {
    const value = opt[key];
    if (Array.isArray(value)) {
      const mode = key === "options" ? "option" : key === "media" ? "media" : undefined;
      arrays[key] = analyzeArray(
        value,
        (stack ??= new WeakSet()),
        mode,
        ComponentModel.hasClass(key),
      );
      continue;
    }

    if (isPlainObject(value)) {
      const mode = key === "baseOption" ? "option" : undefined;
      objectShapes[key] = buildShape(value, (stack ??= new WeakSet()), mode);
      continue;
    }

    // ECharts ignores nullish values and non-object component options during top-level merge.
    if (value != null && (!ComponentModel.hasClass(key) || isComponentOption(value))) {
      leaves.push(key);
    }
  }

  if (leaves.length > 1) {
    leaves.sort();
  }

  return {
    arrays,
    objectShapes,
    leaves,
  };
}

function hasArrayRemoval(prev: ArraySummary, next: ArraySummary | undefined): boolean {
  if (!next) {
    return prev.shapes.length > 0;
  }

  if (next.shapes.length < prev.shapes.length || next.noIdCount < prev.noIdCount) {
    return true;
  }
  for (const id of prev.ids) {
    if (!next.ids.has(id)) {
      return true;
    }
  }
  return false;
}

function isArrayShape(shape: Shape): shape is ArraySummary {
  return shape !== true && Array.isArray(shape.shapes);
}

function hasShapeRemoval(prev: Shape, next: Shape): boolean {
  if (prev === true || next === true) {
    return false;
  }

  const prevIsArray = isArrayShape(prev);
  const nextIsArray = isArrayShape(next);
  if (prevIsArray || nextIsArray) {
    return (
      !prevIsArray ||
      !nextIsArray ||
      hasArrayRemoval(prev, next) ||
      hasItemShapeRemoval(prev.shapes, next.shapes)
    );
  }

  for (const key in prev) {
    const nextChild = next[key];
    if (nextChild === undefined || hasShapeRemoval(prev[key] as Shape, nextChild)) {
      return true;
    }
  }
  return false;
}

function hasItemShapeRemoval(prev: ArrayItemShape[], next: ArrayItemShape[]): boolean {
  let nextById: Map<string, Shape> | undefined;
  let nextByName: Map<string, ArrayItemShape[]> | undefined;
  let namedMatches: Set<ArrayItemShape> | undefined;

  for (const item of prev) {
    if (item.id !== undefined) {
      if (!nextById) {
        nextById = new Map();
        for (const nextItem of next) {
          if (nextItem.id !== undefined) {
            nextById.set(nextItem.id, nextItem.shape);
          }
        }
      }
      const nextShape = nextById.get(item.id);
      if (nextShape && hasShapeRemoval(item.shape, nextShape)) {
        return true;
      }
      continue;
    }

    // ECharts matches anonymous components by name before falling back to their array order.
    if (item.name !== undefined) {
      if (!nextByName) {
        nextByName = new Map();
        for (let i = next.length - 1; i >= 0; i--) {
          const nextItem = next[i];
          if (nextItem.id === undefined && nextItem.name !== undefined) {
            const matches = nextByName.get(nextItem.name);
            if (matches) {
              matches.push(nextItem);
            } else {
              nextByName.set(nextItem.name, [nextItem]);
            }
          }
        }
      }
      const nextItem = nextByName.get(item.name)?.pop();
      if (nextItem) {
        const matches = (namedMatches ??= new Set());
        matches.add(item);
        matches.add(nextItem);
        if (hasShapeRemoval(item.shape, nextItem.shape)) {
          return true;
        }
      }
    }
  }

  let nextIndex = 0;
  for (const item of prev) {
    if (item.id !== undefined || namedMatches?.has(item)) {
      continue;
    }
    while (next[nextIndex]?.id !== undefined || namedMatches?.has(next[nextIndex])) {
      nextIndex++;
    }
    const nextShape = next[nextIndex++]?.shape;
    if (nextShape && hasShapeRemoval(item.shape, nextShape)) {
      return true;
    }
  }
  return false;
}

/** Returns replacements, undefined for a plain merge, or null when a rebuild is required. */
function collectReplacements(prev: Signature, next: Signature): string[] | null | undefined {
  let replaceMerge: string[] | undefined;

  for (const key in prev.objectShapes) {
    const prevShape = prev.objectShapes[key];
    const nextShape = next.objectShapes[key];
    if (prevShape && nextShape) {
      if (hasShapeRemoval(prevShape, nextShape)) {
        return null;
      }
      continue;
    }

    if (next.leaves.includes(key)) {
      continue;
    }
    if (!ComponentModel.hasClass(key)) {
      return null;
    }
    (replaceMerge ??= []).push(key);
  }

  let nextLeafIndex = 0;
  for (const key of prev.leaves) {
    while (nextLeafIndex < next.leaves.length && next.leaves[nextLeafIndex] < key) {
      nextLeafIndex++;
    }
    if (
      next.leaves[nextLeafIndex] !== key &&
      next.arrays[key] === undefined &&
      next.objectShapes[key] === undefined
    ) {
      return null;
    }
  }

  for (const key in prev.arrays) {
    const prevArray = prev.arrays[key];
    if (!prevArray) {
      continue;
    }

    const nextArray = next.arrays[key];
    if (nextArray && hasItemShapeRemoval(prevArray.shapes, nextArray.shapes)) {
      return null;
    }

    if (!hasArrayRemoval(prevArray, nextArray)) {
      continue;
    }
    if (!ComponentModel.hasClass(key)) {
      return null;
    }
    (replaceMerge ??= []).push(key);
  }

  return replaceMerge;
}

/**
 * Produce an update plan that preserves option deletions.
 * Falls back to `notMerge: true` when the change looks complex.
 */
export function planUpdate(prev: Signature | undefined, option: Option): PlannedUpdate {
  const next = buildSignature(option);

  if (!prev) {
    return {
      signature: next,
      plan: { notMerge: false },
    };
  }

  const replaceMerge = collectReplacements(prev, next);
  if (replaceMerge === null) {
    return {
      signature: next,
      plan: { notMerge: true },
    };
  }
  if (replaceMerge && replaceMerge.length > 1) {
    replaceMerge.sort();
  }

  return {
    signature: next,
    plan: replaceMerge ? { notMerge: false, replaceMerge } : { notMerge: false },
  };
}
