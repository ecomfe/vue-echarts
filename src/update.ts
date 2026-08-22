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
type Shape = true | ObjectShape;
type ArrayItemShape = {
  id: string | undefined;
  shape: Shape;
};

/** Summary of a top-level array key for deletion detection. */
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
  /** Lengths of `option.options` and `option.media` (0 if not arrays). */
  optionsLength: number;
  mediaLength: number;
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

function isShapeObject(value: unknown): value is Record<string, unknown> {
  if (!isPlainObject(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.prototype;
}

function buildShape(value: unknown, stack: WeakSet<object>): Shape {
  if (!isShapeObject(value) || stack.has(value)) {
    return true;
  }

  stack.add(value);
  const shape: ObjectShape = Object.create(null);
  for (const key of Object.keys(value)) {
    if (value[key] !== undefined) {
      shape[key] = buildShape(value[key], stack);
    }
  }
  stack.delete(value);
  return shape;
}

function analyzeArray(items: unknown[], stack: WeakSet<object>): ArraySummary {
  const ids = new Set<string>();
  let noIdCount = 0;
  const shapes: ArrayItemShape[] = [];

  for (let i = 0; i < items.length; i++) {
    const id = readId(items[i]);
    shapes.push({ id, shape: buildShape(items[i], stack) });
    if (id === undefined) {
      noIdCount++;
      continue;
    }
    ids.add(id);
  }

  return {
    idsSorted: ids.size > 0 ? Array.from(ids).sort() : [],
    noIdCount,
    shapes,
  };
}

/**
 * Build a structural signature without retaining option values.
 * Nested arrays are leaves because ECharts replaces them instead of merging their contents.
 */
export function buildSignature(option: Option): Signature {
  const opt = option as Record<string, unknown>;

  const optionsLength = Array.isArray(opt.options) ? opt.options.length : 0;
  const mediaLength = Array.isArray(opt.media) ? opt.media.length : 0;

  const stack = new WeakSet<object>();
  const arrays: Record<string, ArraySummary | undefined> = Object.create(null);
  const objectShapes: Record<string, Shape | undefined> = Object.create(null);
  const scalars: string[] = [];

  for (const key of Object.keys(opt)) {
    if (key === "options" || key === "media") {
      continue;
    }

    const value = opt[key];
    if (Array.isArray(value)) {
      arrays[key] = analyzeArray(value, stack);
      continue;
    }

    if (isPlainObject(value)) {
      objectShapes[key] = buildShape(value, stack);
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
    optionsLength,
    mediaLength,
    arrays,
    objectShapes,
    scalars,
  };
}

function hasMissing(prev: readonly string[], next: readonly string[]): boolean {
  if (prev.length === 0) {
    return false;
  }
  if (next.length === 0) {
    return true;
  }

  const nextSet = new Set(next);
  for (let i = 0; i < prev.length; i++) {
    if (!nextSet.has(prev[i])) {
      return true;
    }
  }

  return false;
}

function hasArrayRemoval(prev: ArraySummary, next: ArraySummary | undefined): boolean {
  if (!next) {
    return prev.idsSorted.length > 0 || prev.noIdCount > 0;
  }

  return hasMissing(prev.idsSorted, next.idsSorted) || next.noIdCount < prev.noIdCount;
}

function hasShapeRemoval(prev: Shape, next: Shape): boolean {
  if (prev === true || next === true) {
    return false;
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
  const nextById = new Map<string, Shape>();
  const nextAnonymous: Shape[] = [];

  for (const item of next) {
    if (item.id === undefined) {
      nextAnonymous.push(item.shape);
    } else {
      nextById.set(item.id, item.shape);
    }
  }

  let anonymousIndex = 0;
  for (const item of prev) {
    const nextShape =
      item.id === undefined ? nextAnonymous[anonymousIndex++] : nextById.get(item.id);
    if (nextShape && hasShapeRemoval(item.shape, nextShape)) {
      return true;
    }
  }
  return false;
}

function shouldForceNotMerge(prev: Signature, next: Signature): boolean {
  if (next.optionsLength < prev.optionsLength) {
    return true;
  }

  if (next.mediaLength < prev.mediaLength) {
    return true;
  }

  for (const key of Object.keys(prev.objectShapes)) {
    const prevShape = prev.objectShapes[key];
    const nextShape = next.objectShapes[key];
    if (prevShape && nextShape) {
      if (hasShapeRemoval(prevShape, nextShape)) {
        return true;
      }
      continue;
    }
    if (next.arrays[key] === undefined && !next.scalars.includes(key)) {
      return true;
    }
  }

  return hasMissing(prev.scalars, next.scalars);
}

/** Returns null when replaceMerge cannot represent a destructive array change. */
function collectReplacements(prev: Signature, next: Signature): Set<string> | null {
  const replaceMerge = new Set<string>();

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
    replaceMerge.add(key);
  }

  for (const key of Object.keys(prev.objectShapes)) {
    if (!next.arrays[key]) {
      continue;
    }
    if (!ComponentModel.hasClass(key)) {
      return null;
    }
    replaceMerge.add(key);
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

  const replaceMergeSet = shouldForceNotMerge(prev, next) ? null : collectReplacements(prev, next);
  if (!replaceMergeSet) {
    return {
      signature: next,
      plan: { notMerge: true },
    };
  }
  const replaceMerge = replaceMergeSet.size > 0 ? Array.from(replaceMergeSet).sort() : undefined;

  return {
    signature: next,
    plan: replaceMerge ? { notMerge: false, replaceMerge } : { notMerge: false },
  };
}
