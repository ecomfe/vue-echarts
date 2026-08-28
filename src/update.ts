import { ComponentModel } from "echarts/core";

import type { Option } from "./types";
import { isPlainObject } from "./utils";

interface ObjectShape {
  [key: string]: Shape | undefined;
}
type Shape = true | ObjectShape | ItemShape[];
type ItemShape = {
  id: string | undefined;
  name: string | undefined;
  shape: Shape;
};
type ShapeMode = "option" | "media" | "graphic";
type AnalysisContext = {
  hasAction: boolean;
};

function toIdentity(value: unknown): string | undefined {
  return typeof value === "string" || typeof value === "number" ? String(value) : undefined;
}

/** Minimal signature of an option used to decide setOption behavior. */
export interface Signature {
  /** Map of top-level arrays and singleton components to their summaries. */
  collections: Record<string, ItemShape[] | undefined>;
  /** Structural snapshots used to detect nested property removal without retaining option values. */
  objectShapes: Record<string, Shape | undefined>;
  /** Top-level keys whose values are not traversed. */
  leaves: string[];
  /** Whether the option delegates graphic element changes to `$action`. */
  hasAction: boolean;
}

interface PlannedUpdate {
  signature: Signature;
  plan: {
    notMerge: boolean;
    replaceMerge?: string[];
  };
}

function buildShape(
  value: unknown,
  context: AnalysisContext,
  mode?: ShapeMode,
): true | ObjectShape {
  if (!isPlainObject(value)) {
    return true;
  }

  const shape: ObjectShape = Object.create(null);
  for (const key of Object.keys(value)) {
    const child = value[key];
    if (child === undefined) {
      continue;
    }
    if (mode === "graphic" && key === "$action") {
      context.hasAction = true;
    }
    if (mode === "graphic" && (key === "elements" || key === "children") && Array.isArray(child)) {
      shape[key] = analyzeItems(child, context, "graphic", true);
      continue;
    }
    if (mode === "option") {
      const componentItems = ComponentModel.hasClass(key);
      if (Array.isArray(child) || (componentItems && isPlainObject(child))) {
        shape[key] = analyzeItems(
          Array.isArray(child) ? child : [child],
          context,
          key === "graphic" ? "graphic" : undefined,
          componentItems,
        );
        continue;
      }
    }
    shape[key] =
      mode === "media" && key === "option"
        ? buildShape(child, context, "option")
        : buildShape(child, context);
  }
  return shape;
}

function analyzeItems(
  items: unknown[],
  context: AnalysisContext,
  mode: ShapeMode | undefined,
  componentItems: boolean,
): ItemShape[] {
  const shapes: ItemShape[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (componentItems && !isPlainObject(item)) {
      continue;
    }
    const identity = componentItems ? (item as Record<string, unknown>) : undefined;
    shapes.push({
      id: toIdentity(identity?.id),
      name: toIdentity(identity?.name),
      shape: buildShape(item, context, mode),
    });
  }

  return shapes;
}

/**
 * Build a structural signature that retains component identities but not option payload values.
 * Data arrays inside component items remain leaves. Graphic element trees and nested option units
 * (`baseOption`, timeline options, and media options) reuse collection summaries.
 */
function buildSignature(option: Option): Signature {
  const opt = option as Record<string, unknown>;

  const context: AnalysisContext = { hasAction: false };
  const collections: Record<string, ItemShape[] | undefined> = Object.create(null);
  const objectShapes: Record<string, Shape | undefined> = Object.create(null);
  const leaves: string[] = [];

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
      const shapes = analyzeItems(
        Array.isArray(value) ? value : [value],
        context,
        mode,
        componentItems,
      );
      collections[key] = shapes;
      continue;
    }

    if (isPlainObject(value)) {
      const mode = key === "baseOption" ? "option" : undefined;
      const shape = buildShape(value, context, mode);
      objectShapes[key] = shape;
      continue;
    }

    if (value != null && !componentItems) {
      leaves.push(key);
    }
  }

  return {
    collections,
    objectShapes,
    leaves,
    hasAction: context.hasAction,
  };
}

function hasCollectionRemoval(prev: ItemShape[], next: ItemShape[] | undefined): boolean {
  if (!next) {
    return prev.length > 0;
  }
  return next.length < prev.length;
}

function getItemIdentity(item: ItemShape): string | undefined {
  return item.id !== undefined
    ? `id:${item.id}`
    : item.name !== undefined
      ? `name:${item.name}`
      : undefined;
}

function hasIdentityChange(prev: ItemShape[], next: ItemShape[]): boolean {
  const length = Math.min(prev.length, next.length);
  for (let index = 0; index < length; index++) {
    const previous = getItemIdentity(prev[index]);
    const current = getItemIdentity(next[index]);
    if (previous !== current && (previous !== undefined || current !== undefined)) {
      return true;
    }
  }
  return false;
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

  const prevIsCollection = Array.isArray(prev);
  const nextIsCollection = Array.isArray(next);
  if (prevIsCollection || nextIsCollection) {
    return (
      !prevIsCollection ||
      !nextIsCollection ||
      hasCollectionRemoval(prev, next) ||
      hasIdentityChange(prev, next) ||
      findItemShapeRemoval(prev, next) !== undefined
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
  let anonymousRemoval: ItemShape | undefined;

  for (let index = 0; index < prev.length; index++) {
    const item = prev[index];
    let nextShape: Shape | undefined;
    if (item.id !== undefined) {
      nextShape = next.find((candidate) => candidate.id === item.id)?.shape;
    } else {
      nextShape = next[index]?.shape;
    }
    if (nextShape && hasShapeRemoval(item.shape, nextShape)) {
      if (item.id !== undefined) {
        return item;
      }
      anonymousRemoval ??= item;
    }
  }
  return anonymousRemoval;
}

/** Returns replacements, undefined for a plain merge, or null when a rebuild is required. */
function collectReplacements(prev: Signature, next: Signature): string[] | null | undefined {
  let replaceMerge: string[] | undefined;

  // Global arrays may already contain theme/default entries, while aria is only
  // auto-enabled when it is present during initial model creation.
  if (next.objectShapes.aria && !prev.objectShapes.aria) {
    return null;
  }
  for (const key in next.collections) {
    if (
      !prev.collections[key] &&
      !prev.objectShapes[key] &&
      !prev.leaves.includes(key) &&
      !ComponentModel.hasClass(key)
    ) {
      return null;
    }
  }

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

  for (const key of prev.leaves) {
    if (
      !next.leaves.includes(key) &&
      next.collections[key] === undefined &&
      next.objectShapes[key] === undefined
    ) {
      return null;
    }
  }

  for (const key in prev.collections) {
    const prevCollection = prev.collections[key]!;
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
    const identityChange =
      nextCollection && !collectionRemoval && hasIdentityChange(prevCollection, nextCollection);
    const shapeRemoval = nextCollection
      ? findItemShapeRemoval(prevCollection, nextCollection)
      : undefined;
    // replaceMerge recreates anonymous items, but explicit ids are merged into existing models.
    if (shapeRemoval?.id !== undefined) {
      return null;
    }

    if (!shapeRemoval && !collectionRemoval && !identityChange) {
      continue;
    }
    if (!ComponentModel.hasClass(key)) {
      return null;
    }
    if (nextCollection && !preservesReplacementOrder(prevCollection, nextCollection)) {
      return null;
    }
    (replaceMerge ??= []).push(key);
  }

  return replaceMerge;
}

/**
 * Produce an update plan that preserves option structure and initialization semantics.
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
  replaceMerge?.sort();

  return {
    signature: next,
    plan: replaceMerge ? { notMerge: false, replaceMerge } : { notMerge: false },
  };
}
