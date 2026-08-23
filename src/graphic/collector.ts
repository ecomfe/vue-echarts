import { warn as coreWarn } from "../utils";
import type { EventHandler } from "../utils";

export type GraphicNode = {
  id: string;
  type: string;
  parentId: string | null;
  props: Record<string, unknown>;
  handlers: Record<string, unknown>;
  handlerCache?: Map<string, { source: unknown; handler: EventHandler }>;
  order: number;
  sourceId: number;
};

export type GraphicCollector = {
  beginPass: () => void;
  register: (node: GraphicRegisterNode) => void;
  unregister: (id: string, sourceId?: number) => void;
  warn: (message: string, onceKey?: string) => void;
  getNodes: () => Iterable<GraphicNode>;
  requestFlush: () => void;
  cancelPendingFlush: () => void;
  dispose: () => void;
};

export type GraphicRegisterNode = Omit<GraphicNode, "handlerCache" | "order"> & {
  order?: number;
};

export function createCollector(options: { onFlush: () => void }): GraphicCollector {
  const { onFlush } = options;
  const nodes = new Map<string, GraphicNode>();
  const seenInPass = new Map<string, number>();
  let warnedKeys: Set<string> | undefined;

  let order = 0;
  let pending = false;
  let disposed = false;

  function beginPass(): void {
    order = 0;
    seenInPass.clear();
  }

  function warn(message: string, onceKey?: string): void {
    if (onceKey !== undefined) {
      if (warnedKeys?.has(onceKey)) {
        return;
      }
      (warnedKeys ??= new Set()).add(onceKey);
    }
    coreWarn(message);
  }

  function register(node: GraphicRegisterNode): void {
    if (disposed) {
      return;
    }

    const seenSource = seenInPass.get(node.id);
    if (seenSource != null && seenSource !== node.sourceId) {
      warn(
        `Duplicate graphic id "${node.id}" detected. Updates may be unstable.`,
        `duplicate-id:${node.id}`,
      );
    }

    const nextOrder = node.order ?? order;
    order = Math.max(order, nextOrder + 1);
    const existing = nodes.get(node.id);

    if (existing?.sourceId === node.sourceId) {
      existing.type = node.type;
      existing.parentId = node.parentId;
      existing.props = node.props;
      existing.handlers = node.handlers;
      existing.order = nextOrder;
    } else {
      nodes.set(node.id, {
        ...node,
        order: nextOrder,
      });
    }
    seenInPass.set(node.id, node.sourceId);
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
    requestFlush();
  }

  function requestFlush(): void {
    if (disposed || pending) {
      return;
    }
    pending = true;
    queueMicrotask(() => {
      if (disposed || !pending) {
        return;
      }
      pending = false;
      beginPass();
      onFlush();
    });
  }

  function getNodes(): Iterable<GraphicNode> {
    return nodes.values();
  }

  function cancelPendingFlush(): void {
    pending = false;
    beginPass();
  }

  function dispose(): void {
    disposed = true;
    pending = false;
    nodes.clear();
    seenInPass.clear();
    warnedKeys = undefined;
  }

  return {
    beginPass,
    register,
    unregister,
    warn,
    getNodes,
    requestFlush,
    cancelPendingFlush,
    dispose,
  };
}
