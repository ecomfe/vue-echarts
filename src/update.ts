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
  shape: Shape;
};
type ShapeMode = "option" | "media";

/** Structural summary of an array option for deletion detection. */
export interface ArraySummary {
  /** Unique, sorted string ids extracted from items' `id` field. */
  idsSorted: string[];
  /** Count of items without an `id` field. */
  noIdCount: number;
  /** Structural snapshots aligned with the original items. */
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

/** Normalize an item's supported `id` value to a string. */
function normalizeId(raw: unknown): string | undefined {
  if (typeof raw === "string") {
    return raw;
  }

  if (typeof raw === "number" && Number.isFinite(raw)) {
    return String(raw);
  }

  return undefined;
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
  if (itemShape) {
    itemShape.id = normalizeId(rawId);
  }
  if (stack.has(value)) {
    return true;
  }

  stack.add(value);
  const shape: ObjectShape = Object.create(null);
  for (const key of Object.keys(value)) {
    const child = itemShape && key === "id" ? rawId : value[key];
    if (child === undefined) {
      continue;
    }
    shape[key] =
      mode === "option" && Array.isArray(child)
        ? analyzeArray(child, stack)
        : mode === "media" && key === "option"
          ? buildShape(child, stack, "option")
          : buildShape(child, stack);
  }
  stack.delete(value);
  return shape;
}

function analyzeArray(items: unknown[], stack: WeakSet<object>, mode?: ShapeMode): ArraySummary {
  let ids: Set<string> | undefined;
  let noIdCount = 0;
  const shapes: ArrayItemShape[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemShape: ArrayItemShape = { id: undefined, shape: true };
    itemShape.shape = buildShape(item, stack, mode, itemShape);
    shapes.push(itemShape);
    if (itemShape.id === undefined) {
      noIdCount++;
      continue;
    }
    (ids ??= new Set()).add(itemShape.id);
  }

  return {
    idsSorted: ids ? Array.from(ids).sort() : [],
    noIdCount,
    shapes,
  };
}

/**
 * Build a structural signature without retaining option values.
 * Arrays inside component items remain leaves to avoid traversing chart data. Nested option units
 * (`baseOption`, timeline options, and media options) reuse summaries for their component arrays.
 */
export function buildSignature(option: Option): Signature {
  const opt = option as Record<string, unknown>;

  const stack = new WeakSet<object>();
  const arrays: Record<string, ArraySummary | undefined> = Object.create(null);
  const objectShapes: Record<string, Shape | undefined> = Object.create(null);
  const leaves: string[] = [];

  for (const key of Object.keys(opt)) {
    const value = opt[key];
    if (Array.isArray(value)) {
      const mode = key === "options" ? "option" : key === "media" ? "media" : undefined;
      arrays[key] = analyzeArray(value, stack, mode);
      continue;
    }

    if (isPlainObject(value)) {
      objectShapes[key] =
        key === "baseOption" ? buildShape(value, stack, "option") : buildShape(value, stack);
      continue;
    }

    // `undefined` is treated as absent; all other non-structural values remain leaves.
    if (value !== undefined) {
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

function hasMissing(prev: readonly string[], next: readonly string[]): boolean {
  if (prev.length > next.length) {
    return true;
  }

  let nextIndex = 0;
  for (const value of prev) {
    while (nextIndex < next.length && next[nextIndex] < value) {
      nextIndex++;
    }
    if (next[nextIndex] !== value) {
      return true;
    }
  }

  return false;
}

function hasArrayRemoval(prev: ArraySummary, next: ArraySummary | undefined): boolean {
  if (!next) {
    return prev.shapes.length > 0;
  }

  return (
    next.shapes.length < prev.shapes.length ||
    next.noIdCount < prev.noIdCount ||
    hasMissing(prev.idsSorted, next.idsSorted)
  );
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
  let nextIndex = 0;
  for (const item of prev) {
    let nextShape: Shape | undefined;
    if (item.id === undefined) {
      while (next[nextIndex]?.id !== undefined) {
        nextIndex++;
      }
      nextShape = next[nextIndex++]?.shape;
    } else {
      if (!nextById) {
        nextById = new Map();
        for (const nextItem of next) {
          if (nextItem.id !== undefined) {
            nextById.set(nextItem.id, nextItem.shape);
          }
        }
      }
      nextShape = nextById.get(item.id);
    }
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

    if (next.arrays[key]) {
      if (!ComponentModel.hasClass(key)) {
        return null;
      }
      (replaceMerge ??= []).push(key);
    } else if (!next.leaves.includes(key)) {
      return null;
    }
  }

  if (hasMissing(prev.leaves, next.leaves)) {
    return null;
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
