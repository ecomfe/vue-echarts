import { ComponentModel } from "echarts/core";

import type { Option } from "./types";
import { isPlainObject } from "./utils";

export interface UpdatePlan {
  notMerge: boolean;
  replaceMerge?: string[];
}

/** Summary of a top-level array key for deletion detection. */
export interface ArraySummary {
  /** Unique, sorted string ids extracted from items' `id` field. */
  idsSorted: string[];
  /** Count of items without an `id` field. */
  noIdCount: number;
}

/** Minimal signature of an option used to decide setOption behavior. */
export interface Signature {
  /** Lengths of `option.options` and `option.media` (0 if not arrays). */
  optionsLength: number;
  mediaLength: number;
  /** Map of array-typed top-level keys to their summaries. */
  arrays: Record<string, ArraySummary | undefined>;
  /** Sorted list of object-typed top-level keys. */
  objects: string[];
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

function summarizeArray(items: unknown[]): ArraySummary {
  const ids = new Set<string>();
  let noIdCount = 0;

  for (let i = 0; i < items.length; i++) {
    const id = readId(items[i]);
    if (id === undefined) {
      noIdCount++;
      continue;
    }
    ids.add(id);
  }

  return {
    idsSorted: ids.size > 0 ? Array.from(ids).sort() : [],
    noIdCount,
  };
}

/**
 * Build a minimal signature from a full ECharts option.
 * Only top-level keys are inspected.
 */
export function buildSignature(option: Option): Signature {
  const opt = option as Record<string, unknown>;

  const optionsLength = Array.isArray(opt.options) ? opt.options.length : 0;
  const mediaLength = Array.isArray(opt.media) ? opt.media.length : 0;

  const arrays: Record<string, ArraySummary | undefined> = Object.create(null);
  const objects: string[] = [];
  const scalars: string[] = [];

  for (const key of Object.keys(opt)) {
    if (key === "options" || key === "media") {
      continue;
    }

    const value = opt[key];
    if (Array.isArray(value)) {
      arrays[key] = summarizeArray(value);
      continue;
    }

    if (isPlainObject(value)) {
      objects.push(key);
      continue;
    }

    // scalar: string | number | boolean | null  (undefined is treated as "absent")
    if (value !== undefined) {
      scalars.push(key);
    }
  }

  if (objects.length > 1) {
    objects.sort();
  }
  if (scalars.length > 1) {
    scalars.sort();
  }

  return {
    optionsLength,
    mediaLength,
    arrays,
    objects,
    scalars,
  };
}

function diffKeys(prevKeys: readonly string[], nextKeys: readonly string[]): string[] {
  if (prevKeys.length === 0) {
    return [];
  }
  if (nextKeys.length === 0) {
    return prevKeys.slice();
  }

  const nextSet = new Set(nextKeys);
  const missing: string[] = [];

  for (let i = 0; i < prevKeys.length; i++) {
    const key = prevKeys[i];
    if (!nextSet.has(key)) {
      missing.push(key);
    }
  }

  return missing;
}

function hasMissingIds(prevIds: readonly string[], nextIds: readonly string[]): boolean {
  if (prevIds.length === 0) {
    return false;
  }
  if (nextIds.length === 0) {
    return true;
  }

  const nextSet = new Set(nextIds);
  for (let i = 0; i < prevIds.length; i++) {
    if (!nextSet.has(prevIds[i])) {
      return true;
    }
  }

  return false;
}

function hasArrayRemoval(prev: ArraySummary, next: ArraySummary | undefined): boolean {
  if (!next) {
    return prev.idsSorted.length > 0 || prev.noIdCount > 0;
  }

  return hasMissingIds(prev.idsSorted, next.idsSorted) || next.noIdCount < prev.noIdCount;
}

function shouldForceNotMerge(prev: Signature, next: Signature): boolean {
  if (next.optionsLength < prev.optionsLength) {
    return true;
  }

  if (next.mediaLength < prev.mediaLength) {
    return true;
  }

  const missingObjects = diffKeys(prev.objects, next.objects);
  for (let i = 0; i < missingObjects.length; i++) {
    const key = missingObjects[i];
    if (next.arrays[key] === undefined && !next.scalars.includes(key)) {
      return true;
    }
  }

  return diffKeys(prev.scalars, next.scalars).length > 0;
}

/** Returns null when replaceMerge cannot represent a destructive array change. */
function collectReplacements(prev: Signature, next: Signature): Set<string> | null {
  const replaceMerge = new Set<string>();

  for (const key of Object.keys(prev.arrays)) {
    const prevArray = prev.arrays[key];
    if (!prevArray) {
      continue;
    }

    if (!hasArrayRemoval(prevArray, next.arrays[key])) {
      continue;
    }
    if (!ComponentModel.hasClass(key)) {
      return null;
    }
    replaceMerge.add(key);
  }

  for (let i = 0; i < prev.objects.length; i++) {
    const key = prev.objects[i];
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
