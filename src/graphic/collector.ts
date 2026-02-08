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
  requestFlush: () => void;
  dispose: () => void;
};

export function createStableSerializer() {
  const symbolIds = new Map<symbol, number>();
  const objectIds = new WeakMap<object, number>();
  let symbolId = 0;
  let objectId = 0;

  const getSymbolId = (value: symbol): number => {
    let id = symbolIds.get(value);
    if (id == null) {
      symbolId += 1;
      id = symbolId;
      symbolIds.set(value, id);
    }
    return id;
  };

  const getObjectId = (value: object): number => {
    let id = objectIds.get(value);
    if (id == null) {
      objectId += 1;
      id = objectId;
      objectIds.set(value, id);
    }
    return id;
  };

  const isPlainObject = (value: object): boolean => {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  };

  const stringify = (value: unknown): string => {
    if (value === undefined) {
      return "u";
    }
    if (value === null) {
      return "n";
    }

    const t = typeof value;
    if (t === "string") {
      return `s:${JSON.stringify(value)}`;
    }
    if (t === "number") {
      return `d:${value}`;
    }
    if (t === "boolean") {
      return value ? "b:1" : "b:0";
    }
    if (t === "bigint") {
      return `g:${String(value)}`;
    }
    if (t === "symbol") {
      return `y:${getSymbolId(value as symbol)}`;
    }
    if (t === "function") {
      return `o:${getObjectId(value as object)}`;
    }

    if (Array.isArray(value)) {
      return `[${value.map((item) => stringify(item)).join(",")}]`;
    }

    const obj = value as object;
    if (!isPlainObject(obj)) {
      return `o:${getObjectId(obj)}`;
    }

    const record = obj as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    return `{${keys.map((key) => `${key}:${stringify(record[key])}`).join(",")}}`;
  };

  return stringify;
}

function nodeSig(
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
  const sigById = new Map<string, string>();
  const passById = new Map<string, number>();
  const stringify = createStableSerializer();

  let order = 0;
  let pass = 0;
  let pending = false;
  let disposed = false;

  function beginPass(): void {
    order = 0;
    pass += 1;
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
    if (existing && existing.sourceId !== node.sourceId && existingPass === pass) {
      warnOnce(`duplicate-id:${node.id}`, warnDuplicateId(node.id));
    }

    const nextOrder = node.order ?? order++;
    if (node.order != null && node.order >= order) {
      order = node.order + 1;
    }

    const sig = nodeSig(stringify, { ...node, order: nextOrder });
    if (
      existing &&
      existing.sourceId === node.sourceId &&
      existing.order === nextOrder &&
      sigById.get(node.id) === sig
    ) {
      passById.set(node.id, pass);
      return;
    }

    nodes.set(node.id, {
      ...existing,
      ...node,
      order: nextOrder,
    });
    sigById.set(node.id, sig);
    passById.set(node.id, pass);
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
    sigById.delete(id);
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

  function dispose(): void {
    disposed = true;
    pending = false;
    nodes.clear();
    passById.clear();
    sigById.clear();
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
    requestFlush,
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
