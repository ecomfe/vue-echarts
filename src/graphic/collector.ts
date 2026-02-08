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

export type GraphicCollector = {
  beginPass: () => void;
  register: (node: Omit<GraphicNode, "order"> & { order?: number }) => void;
  unregister: (id: string, sourceId?: number) => void;
  warnOnce: (key: string, message: string) => void;
  getNodes: () => Iterable<GraphicNode>;
  requestFlush: () => void;
  dispose: () => void;
};

export function createGraphicCollector(options: {
  onFlush: () => void;
  warn: (message: string) => void;
}): GraphicCollector {
  const nodes = new Map<string, GraphicNode>();
  const warnedKeys = new Set<string>();
  const passById = new Map<string, number>();

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

    nodes.set(node.id, {
      ...existing,
      ...node,
      order: nextOrder,
    });
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

  function getNodes(): Iterable<GraphicNode> {
    return nodes.values();
  }

  function dispose(): void {
    disposed = true;
    pending = false;
    nodes.clear();
    passById.clear();
    warnedKeys.clear();
  }

  return {
    beginPass,
    register,
    unregister,
    warnOnce,
    getNodes,
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
