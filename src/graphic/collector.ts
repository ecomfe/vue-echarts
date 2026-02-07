import type { Ref } from "vue";
import { shallowRef } from "vue";

import type { Option } from "../types";
import { COMMON_PROP_KEYS } from "./constants";
import { warnDuplicateId } from "./warn";

export type GraphicNode = {
  id: string;
  type: string;
  parentId: string | null;
  props: Record<string, unknown>;
  handlers: Record<string, unknown>;
  order: number;
  sourceId: number;
};

export type GraphicSnapshot = {
  ids: Set<string>;
  parentById: Map<string, string | null>;
  hasDuplicateId: boolean;
};

export type GraphicCollector = {
  beginPass: () => void;
  register: (node: Omit<GraphicNode, "order"> & { order?: number }) => void;
  unregister: (id: string, sourceId?: number) => void;
  warnOnce: (key: string, message: string) => void;
  optionRef: Ref<Option | null>;
  getNodes: () => Iterable<GraphicNode>;
  getSnapshot: () => GraphicSnapshot;
  setSnapshot: (snapshot: GraphicSnapshot) => void;
  requestFlush: () => void;
  getStructureVersion: () => number;
  dispose: () => void;
};

export function createStableSerializer() {
  type UnknownFn = (...args: unknown[]) => unknown;
  const functionIds = new WeakMap<UnknownFn, number>();
  const symbolIds = new Map<symbol, number>();
  const objectIds = new WeakMap<object, number>();
  let functionCursor = 0;
  let symbolCursor = 0;
  let objectCursor = 0;

  const ensureFunctionId = (fn: UnknownFn): number => {
    let id = functionIds.get(fn);
    if (id == null) {
      functionCursor += 1;
      id = functionCursor;
      functionIds.set(fn, id);
    }
    return id;
  };

  const ensureSymbolId = (symbol: symbol): number => {
    let id = symbolIds.get(symbol);
    if (id == null) {
      symbolCursor += 1;
      id = symbolCursor;
      symbolIds.set(symbol, id);
    }
    return id;
  };

  const ensureObjectId = (object: object): number => {
    let id = objectIds.get(object);
    if (id == null) {
      objectCursor += 1;
      id = objectCursor;
      objectIds.set(object, id);
    }
    return id;
  };

  const stringify = (value: unknown): string => {
    if (value === undefined) {
      return "u";
    }
    if (value === null) {
      return "n";
    }

    const valueType = typeof value;
    if (valueType === "string") {
      return `s:${JSON.stringify(value)}`;
    }
    if (valueType === "number") {
      return `d:${value}`;
    }
    if (valueType === "boolean") {
      return value ? "b:1" : "b:0";
    }
    if (valueType === "bigint") {
      return `g:${String(value)}`;
    }
    if (valueType === "symbol") {
      return `y:${ensureSymbolId(value as symbol)}`;
    }
    if (valueType === "function") {
      return `f:${ensureFunctionId(value as UnknownFn)}`;
    }

    if (Array.isArray(value)) {
      return `[${value.map((item) => stringify(item)).join(",")}]`;
    }

    const objectValue = value as object;
    const prototype = Object.getPrototypeOf(objectValue);
    if (prototype !== Object.prototype && prototype !== null) {
      return `o:${ensureObjectId(objectValue)}`;
    }

    const record = objectValue as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    return `{${keys.map((key) => `${key}:${stringify(record[key])}`).join(",")}}`;
  };

  return stringify;
}

function buildNodeFingerprint(
  stringify: (value: unknown) => string,
  node: Omit<GraphicNode, "order"> & { order: number },
): string {
  return [
    node.type,
    node.parentId ?? "null",
    String(node.order),
    stringify(node.props),
    stringify(node.handlers),
  ].join("|");
}

export function createGraphicCollector(options: {
  onFlush: () => void;
  warn: (message: string) => void;
}): GraphicCollector {
  const nodes = new Map<string, GraphicNode>();
  const warnedKeys = new Set<string>();
  const optionRef = shallowRef<Option | null>(null);
  const fingerprintById = new Map<string, string>();
  const passById = new Map<string, number>();
  const stringify = createStableSerializer();

  let order = 0;
  let currentPass = 0;
  let pending = false;
  let disposed = false;
  let structureVersion = 0;

  const snapshot: GraphicSnapshot = {
    ids: new Set(),
    parentById: new Map(),
    hasDuplicateId: false,
  };

  function beginPass(): void {
    order = 0;
    currentPass += 1;
  }

  function warnOnce(key: string, message: string): void {
    if (warnedKeys.has(key)) {
      return;
    }
    warnedKeys.add(key);
    options.warn(message);
  }

  function register(node: Omit<GraphicNode, "order"> & { order?: number }): void {
    if (disposed) {
      return;
    }

    const existing = nodes.get(node.id);
    const existingPass = passById.get(node.id);
    if (existing && existing.sourceId !== node.sourceId && existingPass === currentPass) {
      snapshot.hasDuplicateId = true;
      warnOnce(`duplicate-id:${node.id}`, warnDuplicateId(node.id));
    }

    const nextOrder = node.order ?? order++;
    if (node.order != null && node.order >= order) {
      order = node.order + 1;
    }

    const fingerprint = buildNodeFingerprint(stringify, { ...node, order: nextOrder });
    if (
      existing &&
      existing.sourceId === node.sourceId &&
      existing.order === nextOrder &&
      fingerprintById.get(node.id) === fingerprint
    ) {
      passById.set(node.id, currentPass);
      return;
    }

    nodes.set(node.id, {
      ...existing,
      ...node,
      order: nextOrder,
    });
    fingerprintById.set(node.id, fingerprint);
    passById.set(node.id, currentPass);
    structureVersion += 1;
    requestFlush();
  }

  function unregister(id: string, sourceId?: number): void {
    if (disposed) {
      return;
    }

    const existing = nodes.get(id);
    if (!existing) {
      return;
    }
    if (sourceId != null && existing.sourceId !== sourceId) {
      return;
    }
    nodes.delete(id);
    passById.delete(id);
    fingerprintById.delete(id);
    structureVersion += 1;
    requestFlush();
  }

  function requestFlush(): void {
    if (disposed || pending) {
      return;
    }
    pending = true;
    queueMicrotask(() => {
      pending = false;
      if (disposed) {
        return;
      }
      options.onFlush();
    });
  }

  function getSnapshot(): GraphicSnapshot {
    const ids = new Set<string>();
    const parentById = new Map<string, string | null>();

    for (const node of nodes.values()) {
      ids.add(node.id);
      parentById.set(node.id, node.parentId);
    }

    return { ids, parentById, hasDuplicateId: false };
  }

  function getNodes(): Iterable<GraphicNode> {
    return nodes.values();
  }

  function setSnapshot(next: GraphicSnapshot): void {
    snapshot.ids = next.ids;
    snapshot.parentById = next.parentById;
    snapshot.hasDuplicateId = next.hasDuplicateId;
  }

  function getStructureVersion(): number {
    return structureVersion;
  }

  function dispose(): void {
    disposed = true;
    pending = false;
    nodes.clear();
    passById.clear();
    fingerprintById.clear();
    warnedKeys.clear();
    optionRef.value = null;
  }

  return {
    beginPass,
    register,
    unregister,
    warnOnce,
    optionRef,
    getNodes,
    getSnapshot,
    setSnapshot,
    requestFlush,
    getStructureVersion,
    dispose,
  };
}

export function pickCommonProps(props: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of COMMON_PROP_KEYS) {
    if (key in props && props[key] !== undefined) {
      result[key] = props[key];
    }
  }
  return result;
}
