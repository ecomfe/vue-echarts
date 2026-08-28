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

type GraphicRegisterNode = Omit<GraphicNode, "handlerCache" | "order"> & {
  order?: number;
};

export function createCollector(onFlush: () => void): GraphicCollector {
  const nodes = new Map<string, GraphicNode>();
  const seenInPass = new Map<string, number>();
  const warnedKeys = new Set<string>();

  let order = 0;
  let pending = false;
  let disposed = false;

  function beginPass(): void {
    order = 0;
    seenInPass.clear();
  }

  function warn(message: string, onceKey?: string): void {
    if (onceKey !== undefined) {
      if (warnedKeys.has(onceKey)) {
        return;
      }
      warnedKeys.add(onceKey);
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
    const sameSource = existing?.sourceId === node.sourceId;
    const unchanged =
      sameSource &&
      existing.type === node.type &&
      existing.parentId === node.parentId &&
      existing.props === node.props &&
      existing.handlers === node.handlers &&
      existing.order === nextOrder;

    seenInPass.set(node.id, node.sourceId);
    // Props and attrs are stable proxies; their watcher covers value-only changes.
    if (unchanged) {
      return;
    }

    if (sameSource) {
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
    if (pending) {
      pending = false;
      beginPass();
    }
  }

  function dispose(): void {
    disposed = true;
    pending = false;
    nodes.clear();
    seenInPass.clear();
    warnedKeys.clear();
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
