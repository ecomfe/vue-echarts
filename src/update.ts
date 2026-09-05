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
  /** Graphic elements cannot merge a change of type. */
  type?: string;
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

enum UpdateKind {
  Merge,
  Replace,
  Reset,
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

  for (const item of items) {
    const identity = componentItems ? (item as Record<string, unknown>) : undefined;
    shapes.push({
      id: toIdentity(identity?.id),
      name: toIdentity(identity?.name),
      ...(mode === "graphic" ? { type: toIdentity(identity?.type) } : {}),
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

    if (value !== undefined && !componentItems) {
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
      compareItemShapes(prev, next) !== UpdateKind.Merge
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

function compareItemShapes(prev: ItemShape[], next: ItemShape[]): UpdateKind {
  const byId = new Map<string, ItemShape>();
  for (const item of next) {
    if (item.id !== undefined && !byId.has(item.id)) {
      byId.set(item.id, item);
    }
  }
  let kind = UpdateKind.Merge;

  for (let index = 0; index < prev.length; index++) {
    const item = prev[index];
    const candidate = item.id !== undefined ? byId.get(item.id) : next[index];
    if (
      candidate &&
      (item.type !== candidate.type || hasShapeRemoval(item.shape, candidate.shape))
    ) {
      // replaceMerge recreates anonymous items, but merges items with explicit IDs.
      if (item.id !== undefined) {
        return UpdateKind.Reset;
      }
      kind = UpdateKind.Replace;
    }
  }
  return kind;
}

function needsGlobalReset(prev: Signature, next: Signature): boolean {
  // Global arrays may already contain theme/default entries, while aria is only
  // auto-enabled when it is present during initial model creation.
  if (next.objectShapes.aria && !prev.objectShapes.aria) {
    return true;
  }
  for (const key in next.collections) {
    if (
      !prev.collections[key] &&
      !prev.objectShapes[key] &&
      !prev.leaves.includes(key) &&
      !ComponentModel.hasClass(key)
    ) {
      return true;
    }
  }

  for (const key in prev.objectShapes) {
    const prevShape = prev.objectShapes[key];
    const nextShape = next.objectShapes[key];
    if (prevShape && nextShape) {
      if (hasShapeRemoval(prevShape, nextShape)) {
        return true;
      }
      continue;
    }

    if (!next.leaves.includes(key)) {
      return true;
    }
  }

  for (const key of prev.leaves) {
    if (
      !next.leaves.includes(key) &&
      next.collections[key] === undefined &&
      next.objectShapes[key] === undefined
    ) {
      return true;
    }
  }

  return false;
}

function compareCollection(prev: ItemShape[], next: ItemShape[] | undefined): UpdateKind {
  const kind = next ? compareItemShapes(prev, next) : UpdateKind.Merge;
  if (kind === UpdateKind.Reset) {
    return kind;
  }
  if (
    kind === UpdateKind.Merge &&
    !hasCollectionRemoval(prev, next) &&
    !(next && hasIdentityChange(prev, next))
  ) {
    return UpdateKind.Merge;
  }
  return next && !preservesReplacementOrder(prev, next) ? UpdateKind.Reset : UpdateKind.Replace;
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

  let reset = needsGlobalReset(prev, next);
  const replaceMerge: string[] = [];
  for (const key in prev.collections) {
    const collection = next.collections[key];
    const kind = compareCollection(prev.collections[key]!, collection);
    if (!ComponentModel.hasClass(key)) {
      // Removing even an empty setting array can expose theme/default entries.
      reset ||= !collection || kind !== UpdateKind.Merge;
    } else if (kind === UpdateKind.Reset) {
      reset = true;
    } else if (kind === UpdateKind.Replace) {
      replaceMerge.push(key);
    }
  }

  // Command compatibility is separate from snapshot analysis: keep the target tree
  // and all safe unrelated replacements even when a complete reset is unavailable.
  const replacements = next.hasAction
    ? replaceMerge.filter((key) => key !== "graphic")
    : replaceMerge;
  const notMerge = reset && !next.hasAction;

  return {
    signature: next,
    plan:
      !notMerge && replacements.length
        ? { notMerge, replaceMerge: replacements.sort() }
        : { notMerge },
  };
}
