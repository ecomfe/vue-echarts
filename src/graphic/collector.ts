import { queuePostFlushCb } from "vue";

import { isIgnorableWatchChange, warn as coreWarn } from "../utils";
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
  element?: HTMLElement;
  version?: number;
};

export type GraphicCollector = {
  beginPass: () => void;
  register: (node: GraphicRegisterNode) => void;
  unregister: (id: string, sourceId: number) => void;
  warn: (message: string, onceKey: string) => void;
  getNodes: () => Iterable<GraphicNode>;
  requestFlush: (id?: string, sourceId?: number) => void;
  cancelPendingFlush: () => void;
  setRoot: (root: HTMLElement | undefined) => void;
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
  let version = 0;
  let pending = false;
  let root: HTMLElement | undefined;
  let observer: MutationObserver | undefined;
  const byElement = new WeakMap<HTMLElement, GraphicNode>();
  let orderedIds: string[] = [];

  function syncOrder(): boolean {
    if (!root) {
      return false;
    }
    const ids: string[] = [];
    const walker = root.ownerDocument.createTreeWalker(root, 1);
    for (let element = walker.nextNode(); element; element = walker.nextNode()) {
      const node = byElement.get(element as HTMLElement);
      if (node && nodes.get(node.id) === node) {
        node.order = ids.length;
        ids.push(node.id);
      }
    }
    const changed =
      ids.length !== orderedIds.length || ids.some((id, index) => id !== orderedIds[index]);
    orderedIds = ids;
    return changed;
  }

  function setRoot(value: HTMLElement | undefined): void {
    observer?.disconnect();
    root = value;
    orderedIds = [];
    if (root) {
      // Wrapper components can move unchanged children without rerendering a G* component.
      observer = new MutationObserver(() => {
        if (syncOrder()) {
          requestFlush();
        }
      });
      observer.observe(root, { childList: true, subtree: true });
    }
  }

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
      isIgnorableWatchChange(existing.handlers, node.handlers) &&
      existing.element === node.element &&
      (node.element !== undefined || existing.order === nextOrder);

    seenInPass.set(node.id, node.sourceId);
    // Props and attrs are stable proxies; their watcher covers value-only changes.
    if (unchanged) {
      return;
    }

    const registered = {
      ...node,
      handlerCache: sameSource ? existing?.handlerCache : undefined,
      order: nextOrder,
      version: ++version,
    };
    nodes.set(node.id, registered);
    if (node.element) {
      byElement.set(node.element, registered);
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

  function requestFlush(id?: string, sourceId?: number): void {
    const node = id === undefined ? undefined : nodes.get(id);
    if (node && node.sourceId === sourceId) {
      node.version = ++version;
    }
    if (pending) {
      return;
    }
    pending = true;
    queuePostFlushCb(() => {
      if (!pending) {
        return;
      }
      pending = false;
      beginPass();
      onFlush();
    });
  }

  function getNodes(): Iterable<GraphicNode> {
    syncOrder();
    return root ? orderedIds.map((id) => nodes.get(id)!) : nodes.values();
  }

  function dispose(): void {
    cancelPendingFlush();
    setRoot(undefined);
    nodes.clear();
  }

  function cancelPendingFlush(): void {
    pending = false;
    syncOrder();
    beginPass();
  }

  return {
    beginPass,
    register,
    unregister,
    warn,
    getNodes,
    requestFlush,
    cancelPendingFlush,
    setRoot,
    dispose,
  };
}
