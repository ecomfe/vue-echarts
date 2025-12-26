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

/**
 * Read an item's `id` as a string.
 * Only accept string or number. Other types are ignored to surface inconsistent data early.
 */
function readId(item: unknown): string | undefined {
  if (!isPlainObject(item)) {
    return undefined;
  }
  const raw = (item as { id?: unknown }).id;
  if (typeof raw === "string") {
    return raw;
  }
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return String(raw);
  }
  return undefined;
}

/**
 * Build a minimal signature from a full ECharts option.
 * Only top-level keys are inspected.
 */
export function buildSignature(option: Option): Signature {
  const opt = option as Record<string, unknown>;

  const optionsLength = Array.isArray(opt.options) ? (opt.options as unknown[]).length : 0;
  const mediaLength = Array.isArray(opt.media) ? (opt.media as unknown[]).length : 0;

  const arrays: Record<string, ArraySummary | undefined> = Object.create(null);
  const objects: string[] = [];
  const scalars: string[] = [];

  for (const key of Object.keys(opt)) {
    if (key === "options" || key === "media") {
      continue;
    }

    const value = opt[key];

    if (Array.isArray(value)) {
      const items = value as unknown[];
      const ids = new Set<string>();
      let noIdCount = 0;

      for (let i = 0; i < items.length; i++) {
        const id = readId(items[i]);
        if (id !== undefined) {
          ids.add(id);
        } else {
          noIdCount++;
        }
      }

      const idsSorted = ids.size > 0 ? Array.from(ids).sort() : [];

      arrays[key] = { idsSorted, noIdCount };
    } else if (isPlainObject(value)) {
      objects.push(key);
    } else {
      // scalar: string | number | boolean | null  (undefined is treated as "absent")
      if (value !== undefined) {
        scalars.push(key);
      }
    }
  }

  if (objects.length > 1) {
    objects.sort();
  }
  if (scalars.length > 1) {
    scalars.sort();
  }

  return { optionsLength, mediaLength, arrays, objects, scalars };
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

export interface PlannedUpdate {
  option: Option;
  signature: Signature;
  plan: UpdatePlan;
}

/**
 * Produce an update plan plus a normalized option that encodes common deletions.
 * Falls back to `notMerge: true` when the change looks complex.
 */
export function planUpdate(prev: Signature | undefined, option: Option): PlannedUpdate {
  const next = buildSignature(option);

  if (!prev) {
    return { option, signature: next, plan: { notMerge: false } };
  }

  if (next.optionsLength < prev.optionsLength) {
    return { option, signature: next, plan: { notMerge: true } };
  }
  if (next.mediaLength < prev.mediaLength) {
    return { option, signature: next, plan: { notMerge: true } };
  }

  if (diffKeys(prev.scalars, next.scalars).length > 0) {
    return { option, signature: next, plan: { notMerge: true } };
  }

  const replace = new Set<string>();
  const overrides = new Map<string, null | []>();

  const missingObjects = diffKeys(prev.objects, next.objects);
  for (let i = 0; i < missingObjects.length; i++) {
    overrides.set(missingObjects[i], null);
  }

  for (const key of Object.keys(prev.arrays)) {
    const prevArray = prev.arrays[key];
    if (!prevArray) {
      continue;
    }

    const nextArray = next.arrays[key];

    if (!nextArray) {
      if (prevArray.idsSorted.length > 0 || prevArray.noIdCount > 0) {
        overrides.set(key, []);
        replace.add(key);
      }
      continue;
    }

    if (hasMissingIds(prevArray.idsSorted, nextArray.idsSorted)) {
      replace.add(key);
      continue;
    }

    if (nextArray.noIdCount < prevArray.noIdCount) {
      replace.add(key);
    }
  }

  let normalizedOption = option;
  let signature = next;

  if (overrides.size > 0) {
    const clone = { ...(option as Record<string, unknown>) };
    overrides.forEach((value, key) => {
      clone[key] = value;
    });
    normalizedOption = clone as Option;
    signature = buildSignature(normalizedOption);
  }

  const replaceMerge = replace.size > 0 ? Array.from(replace).sort() : undefined;

  const plan = replaceMerge ? { notMerge: false, replaceMerge } : { notMerge: false };

  return {
    option: normalizedOption,
    signature,
    plan,
  };
}
