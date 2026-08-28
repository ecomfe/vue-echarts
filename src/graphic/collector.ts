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
  unregister: (id: string, sourceId: number) => void;
  warn: (message: string, onceKey: string) => void;
  getNodes: () => Iterable<GraphicNode>;
  requestFlush: () => void;
  cancelPendingFlush: () => void;
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

  function beginPass(): void {
    order = 0;
    seenInPass.clear();
  }

  function warn(message: string, onceKey: string): void {
    if (warnedKeys.has(onceKey)) {
      return;
    }
    warnedKeys.add(onceKey);
    coreWarn(message);
  }

  function register(node: GraphicRegisterNode): void {
    const seenSource = seenInPass.get(node.id);
    if (seenSource !== undefined && seenSource !== node.sourceId) {
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

  function unregister(id: string, sourceId: number): void {
    const existing = nodes.get(id);
    if (!existing || existing.sourceId !== sourceId) {
      return;
    }
    nodes.delete(id);
    requestFlush();
  }

  function requestFlush(): void {
    if (pending) {
      return;
    }
    pending = true;
    queueMicrotask(() => {
      if (!pending) {
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

  return {
    beginPass,
    register,
    unregister,
    warn,
    getNodes,
    requestFlush,
    cancelPendingFlush,
  };
}
