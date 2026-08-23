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
  /** Sorted list of scalar-typed top-level keys (string|number|boolean|null). */
  scalars: string[];
}

export interface PlannedUpdate {
  signature: Signature;
  plan: UpdatePlan;
}

/**
 * Read an item's `id` as a string.
 * Only accept string or number. Other types are ignored to surface inconsistent data early.
 */
function readId(item: unknown): string | undefined {
  if (!isPlainObject(item)) {
    return undefined;
  }

  const raw = item.id;
  if (typeof raw === "string") {
    return raw;
  }

  if (typeof raw === "number" && Number.isFinite(raw)) {
    return String(raw);
  }

  return undefined;
}

function buildShape(value: unknown, stack: WeakSet<object>, mode?: ShapeMode): true | ObjectShape {
  if (!isPlainObject(value) || stack.has(value)) {
    return true;
  }

  stack.add(value);
  const shape: ObjectShape = Object.create(null);
  for (const key of Object.keys(value)) {
    const child = value[key];
    if (child === undefined) {
      continue;
    }
    shape[key] =
      mode === "option" && Array.isArray(child)
        ? analyzeArray(child, stack)
        : mode === "media" && key === "option"
          ? buildOptionShape(child, stack)
          : buildShape(child, stack);
  }
  stack.delete(value);
  return shape;
}

function buildOptionShape(value: unknown, stack: WeakSet<object>): Shape {
  return buildShape(value, stack, "option");
}

function buildMediaShape(value: unknown, stack: WeakSet<object>): Shape {
  return buildShape(value, stack, "media");
}

function analyzeArray(
  items: unknown[],
  stack: WeakSet<object>,
  buildItemShape: (value: unknown, stack: WeakSet<object>) => Shape = buildShape,
): ArraySummary {
  let ids: Set<string> | undefined;
  let noIdCount = 0;
  const shapes: ArrayItemShape[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const id = readId(item);
    shapes.push({ id, shape: buildItemShape(item, stack) });
    if (id === undefined) {
      noIdCount++;
      continue;
    }
    (ids ??= new Set()).add(id);
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
  const scalars: string[] = [];

  for (const key of Object.keys(opt)) {
    const value = opt[key];
    if (Array.isArray(value)) {
      const buildItemShape =
        key === "options" ? buildOptionShape : key === "media" ? buildMediaShape : buildShape;
      arrays[key] = analyzeArray(value, stack, buildItemShape);
      continue;
    }

    if (isPlainObject(value)) {
      objectShapes[key] =
        key === "baseOption" ? buildOptionShape(value, stack) : buildShape(value, stack);
      continue;
    }

    // scalar: string | number | boolean | null  (undefined is treated as "absent")
    if (value !== undefined) {
      scalars.push(key);
    }
  }

  if (scalars.length > 1) {
    scalars.sort();
  }

  return {
    arrays,
    objectShapes,
    scalars,
  };
}

function hasMissing(prev: readonly string[], next: readonly string[]): boolean {
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
    return prev.idsSorted.length > 0 || prev.noIdCount > 0;
  }

  return (
    next.shapes.length < prev.shapes.length ||
    hasMissing(prev.idsSorted, next.idsSorted) ||
    next.noIdCount < prev.noIdCount
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

  for (const key of Object.keys(prev)) {
    const nextChild = next[key];
    if (nextChild === undefined || hasShapeRemoval(prev[key] as Shape, nextChild)) {
      return true;
    }
  }
  return false;
}

function hasItemShapeRemoval(prev: ArrayItemShape[], next: ArrayItemShape[]): boolean {
  let nextById: Map<string, Shape> | undefined;
  let nextAnonymous: Shape[] | undefined;

  for (const item of next) {
    if (item.id === undefined) {
      (nextAnonymous ??= []).push(item.shape);
    } else {
      (nextById ??= new Map()).set(item.id, item.shape);
    }
  }

  let anonymousIndex = 0;
  for (const item of prev) {
    const nextShape =
      item.id === undefined ? nextAnonymous?.[anonymousIndex++] : nextById?.get(item.id);
    if (nextShape && hasShapeRemoval(item.shape, nextShape)) {
      return true;
    }
  }
  return false;
}

/** Returns replacements, undefined for a plain merge, or null when a rebuild is required. */
function collectReplacements(prev: Signature, next: Signature): string[] | null | undefined {
  let replaceMerge: string[] | undefined;

  for (const key of Object.keys(prev.objectShapes)) {
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
    } else if (!next.scalars.includes(key)) {
      return null;
    }
  }

  if (hasMissing(prev.scalars, next.scalars)) {
    return null;
  }

  for (const key of Object.keys(prev.arrays)) {
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
