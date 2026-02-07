import type { Ref } from "vue";
import { shallowRef } from "vue";

import type { Option } from "../types";
import { COMMON_PROP_KEYS } from "./constants";

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
};

export function createGraphicCollector(options: {
  onFlush: () => void;
  warn: (message: string) => void;
}): GraphicCollector {
  const nodes = new Map<string, GraphicNode>();
  const warnedKeys = new Set<string>();
  const optionRef = shallowRef<Option | null>(null);

  let order = 0;
  let currentPass = 0;
  let pending = false;
  const passById = new Map<string, number>();

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
    const existing = nodes.get(node.id);
    const existingPass = passById.get(node.id);
    if (existing && existing.sourceId !== node.sourceId && existingPass === currentPass) {
      snapshot.hasDuplicateId = true;
      warnOnce(
        `duplicate-id:${node.id}`,
        `Duplicate graphic id "${node.id}" detected. Updates may be unstable.`,
      );
    }

    const nextOrder = node.order ?? order++;
    if (node.order != null && node.order >= order) {
      order = node.order + 1;
    }

    nodes.set(node.id, {
      ...existing,
      ...node,
      order: nextOrder,
    });
    passById.set(node.id, currentPass);
    requestFlush();
  }

  function unregister(id: string, sourceId?: number): void {
    const existing = nodes.get(id);
    if (!existing) {
      return;
    }
    if (sourceId != null && existing.sourceId !== sourceId) {
      return;
    }
    nodes.delete(id);
    passById.delete(id);
    requestFlush();
  }

  function requestFlush(): void {
    if (pending) {
      return;
    }
    pending = true;
    queueMicrotask(() => {
      pending = false;
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
