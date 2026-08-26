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
type Shape = true | ObjectShape | CollectionSummary;
type ItemShape = {
  id: string | undefined;
  name: string | undefined;
  shape: Shape;
};
type ShapeMode = "option" | "media" | "graphic";
const EMPTY_IDS: ReadonlySet<string> = new Set();

function toIdentity(value: unknown): string | undefined {
  return typeof value === "string" || typeof value === "number" ? String(value) : undefined;
}

function isComponentOption(value: unknown): boolean {
  return typeof value === "function" || (typeof value === "object" && value !== null);
}

/** Structural summary of an option collection for deletion detection. */
export interface CollectionSummary {
  /** Unique ids used to match component items; empty for positional arrays. */
  ids: ReadonlySet<string>;
  /** Anonymous component items, or all items in a positional array. */
  noIdCount: number;
  /** Structural snapshots in merge order; invalid component entries are omitted. */
  shapes: ItemShape[];
  /** Whether a graphic element explicitly controls its native merge action. */
  hasAction?: true;
}

/** Minimal signature of an option used to decide setOption behavior. */
export interface Signature {
  /** Map of top-level arrays and singleton components to their summaries. */
  collections: Record<string, CollectionSummary | undefined>;
  /** Structural snapshots used to detect nested property removal without retaining option values. */
  objectShapes: Record<string, Shape | undefined>;
  /** Sorted top-level keys whose values are not traversed. */
  leaves: string[];
  /** Whether the option delegates graphic element changes to `$action`. */
  hasAction: boolean;
}

export interface PlannedUpdate {
  signature: Signature;
  plan: UpdatePlan;
}

function buildShape(
  value: unknown,
  stack: WeakSet<object>,
  mode?: ShapeMode,
  itemShape?: ItemShape,
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
    if (mode === "graphic" && (key === "elements" || key === "children") && Array.isArray(child)) {
      shape[key] = analyzeItems(child, stack, "graphic", true);
      continue;
    }
    if (mode === "option") {
      const componentItems = ComponentModel.hasClass(key);
      if (Array.isArray(child) || (componentItems && isPlainObject(child))) {
        shape[key] = analyzeItems(
          Array.isArray(child) ? child : [child],
          stack,
          key === "graphic" ? "graphic" : undefined,
          componentItems,
        );
        continue;
      }
    }
    shape[key] =
      mode === "media" && key === "option"
        ? buildShape(child, stack, "option")
        : buildShape(child, stack);
  }
  stack.delete(value);
  return shape;
}

function isCollectionShape(shape: Shape): shape is CollectionSummary {
  return shape !== true && Array.isArray(shape.shapes);
}

function hasExplicitAction(shape: Shape): boolean {
  if (shape === true) {
    return false;
  }
  if (isCollectionShape(shape)) {
    return shape.hasAction === true;
  }
  for (const key in shape) {
    const child = shape[key];
    if (child !== undefined && hasExplicitAction(child)) {
      return true;
    }
  }
  return false;
}

function analyzeItems(
  items: unknown[],
  stack: WeakSet<object>,
  mode: ShapeMode | undefined,
  componentItems: boolean,
): CollectionSummary {
  let ids: Set<string> | undefined;
  let noIdCount = 0;
  let hasAction = false;
  const shapes: ItemShape[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (componentItems && !isComponentOption(item)) {
      continue;
    }
    const itemShape: ItemShape = { id: undefined, name: undefined, shape: true };
    itemShape.shape = buildShape(item, stack, mode, componentItems ? itemShape : undefined);
    shapes.push(itemShape);
    if (mode !== undefined && !hasAction && itemShape.shape !== true) {
      hasAction =
        (mode === "graphic" && itemShape.shape.$action !== undefined) ||
        hasExplicitAction(itemShape.shape);
    }
    if (itemShape.id === undefined) {
      noIdCount++;
      continue;
    }
    (ids ??= new Set()).add(itemShape.id);
  }

  const summary: CollectionSummary = {
    ids: ids ?? EMPTY_IDS,
    noIdCount,
    shapes,
  };
  if (hasAction) {
    summary.hasAction = true;
  }
  return summary;
}

/**
 * Build a structural signature that retains component identities but not option payload values.
 * Data arrays inside component items remain leaves. Graphic element trees and nested option units
 * (`baseOption`, timeline options, and media options) reuse collection summaries.
 */
export function buildSignature(option: Option): Signature {
  const opt = option as Record<string, unknown>;

  let stack: WeakSet<object> | undefined;
  const collections: Record<string, CollectionSummary | undefined> = Object.create(null);
  const objectShapes: Record<string, Shape | undefined> = Object.create(null);
  const leaves: string[] = [];
  let hasAction = false;

  for (const key of Object.keys(opt)) {
    const value = opt[key];
    const componentItems = ComponentModel.hasClass(key);
    if (Array.isArray(value) || (componentItems && isPlainObject(value))) {
      const mode =
        key === "options"
          ? "option"
          : key === "media"
            ? "media"
            : key === "graphic"
              ? "graphic"
              : undefined;
      const summary = analyzeItems(
        Array.isArray(value) ? value : [value],
        (stack ??= new WeakSet()),
        mode,
        componentItems,
      );
      collections[key] = summary;
      hasAction ||= summary.hasAction === true;
      continue;
    }

    if (isPlainObject(value)) {
      const mode = key === "baseOption" ? "option" : undefined;
      const shape = buildShape(value, (stack ??= new WeakSet()), mode);
      objectShapes[key] = shape;
      hasAction ||= mode !== undefined && hasExplicitAction(shape);
      continue;
    }

    // ECharts ignores nullish values and non-object component options during top-level merge.
    if (value != null && (!componentItems || isComponentOption(value))) {
      leaves.push(key);
    }
  }

  if (leaves.length > 1) {
    leaves.sort();
  }

  return {
    collections,
    objectShapes,
    leaves,
    hasAction,
  };
}

function hasCollectionRemoval(
  prev: CollectionSummary,
  next: CollectionSummary | undefined,
): boolean {
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

function getItemIdentity(item: ItemShape): string | undefined {
  return item.id !== undefined
    ? `id:${item.id}`
    : item.name !== undefined
      ? `name:${item.name}`
      : undefined;
}

function hasMergeOrderChange(prev: ItemShape[], next: ItemShape[]): boolean {
  if (prev.length === next.length) {
    let unchanged = true;
    for (let i = 0; i < prev.length; i++) {
      const previous = prev[i];
      const current = next[i];
      if (
        previous.id !== current.id ||
        (previous.id === undefined && previous.name !== current.name)
      ) {
        unchanged = false;
        break;
      }
    }
    if (unchanged) {
      return false;
    }
  }

  const positions = new Map<string, number[]>();
  for (let i = prev.length - 1; i >= 0; i--) {
    const identity = getItemIdentity(prev[i]);
    if (identity !== undefined) {
      const matches = positions.get(identity);
      if (matches) {
        matches.push(i);
      } else {
        positions.set(identity, [i]);
      }
    }
  }

  return next.some((item, index) => {
    const identity = getItemIdentity(item);
    const previousIndex = identity === undefined ? undefined : positions.get(identity)?.pop();
    // Normal merge appends unmatched explicit ids after every existing model.
    return previousIndex === undefined
      ? item.id !== undefined && index < prev.length
      : previousIndex !== index;
  });
}

function preservesReplacementOrder(prev: ItemShape[], next: ItemShape[]): boolean {
  const positions = new Map<string, number>();
  for (let index = 0; index < prev.length; index++) {
    const item = prev[index];
    if (item.id !== undefined) {
      positions.set(item.id, index);
    }
  }

  return next.every((item, index) => {
    const previousIndex = item.id === undefined ? undefined : positions.get(item.id);
    return previousIndex === undefined || previousIndex === index;
  });
}

function hasShapeRemoval(prev: Shape, next: Shape): boolean {
  if (prev === true || next === true) {
    return false;
  }

  const prevIsCollection = isCollectionShape(prev);
  const nextIsCollection = isCollectionShape(next);
  if (prevIsCollection || nextIsCollection) {
    return (
      !prevIsCollection ||
      !nextIsCollection ||
      hasCollectionRemoval(prev, next) ||
      hasMergeOrderChange(prev.shapes, next.shapes) ||
      findItemShapeRemoval(prev.shapes, next.shapes) !== undefined
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

function findItemShapeRemoval(prev: ItemShape[], next: ItemShape[]): ItemShape | undefined {
  let nextById: Map<string, Shape> | undefined;
  let nextByName: Map<string, ItemShape[]> | undefined;
  let namedMatches: Set<ItemShape> | undefined;
  let anonymousRemoval: ItemShape | undefined;

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
        return item;
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
          anonymousRemoval ??= item;
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
      return item;
    }
  }
  return anonymousRemoval;
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

    if (!next.leaves.includes(key)) {
      return null;
    }
  }

  let nextLeafIndex = 0;
  for (const key of prev.leaves) {
    while (nextLeafIndex < next.leaves.length && next.leaves[nextLeafIndex] < key) {
      nextLeafIndex++;
    }
    if (
      next.leaves[nextLeafIndex] !== key &&
      next.collections[key] === undefined &&
      next.objectShapes[key] === undefined
    ) {
      return null;
    }
  }

  for (const key in prev.collections) {
    const prevCollection = prev.collections[key];
    if (!prevCollection) {
      continue;
    }
    // Replacing graphic would discard the existing elements targeted by `$action`.
    if (key === "graphic" && next.hasAction) {
      continue;
    }

    const nextCollection = next.collections[key];
    // Empty setting arrays can override defaults, so removing them is still meaningful.
    if (!nextCollection && !ComponentModel.hasClass(key)) {
      return null;
    }
    const collectionRemoval = hasCollectionRemoval(prevCollection, nextCollection);
    const orderChange =
      nextCollection &&
      !collectionRemoval &&
      hasMergeOrderChange(prevCollection.shapes, nextCollection.shapes);
    const shapeRemoval = nextCollection
      ? findItemShapeRemoval(prevCollection.shapes, nextCollection.shapes)
      : undefined;
    // replaceMerge recreates anonymous items, but explicit ids are merged into existing models.
    if (shapeRemoval?.id !== undefined) {
      return null;
    }

    if (!shapeRemoval && !collectionRemoval && !orderChange) {
      continue;
    }
    if (!ComponentModel.hasClass(key)) {
      return null;
    }
    if (
      nextCollection &&
      !preservesReplacementOrder(prevCollection.shapes, nextCollection.shapes)
    ) {
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
      // Rebuilding would remove the existing graphic elements targeted by `$action`.
      plan: { notMerge: !next.hasAction },
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
