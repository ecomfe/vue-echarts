import type { Option } from "../types";
import { createEventInvoker, hasEventHandler, parseOnEvent } from "../utils";
import type { EventHandler } from "../utils";
import {
  COMMON_PROP_KEYS,
  COMMON_STYLE_KEYS,
  DISPLAYABLE_PROP_KEYS,
  GROUP_PROP_KEYS,
  PATH_PROP_KEYS,
  PATH_STYLE_KEYS,
  STYLE_KEYS_BY_TYPE,
} from "./props-common";
import { SHAPE_KEYS_BY_TYPE } from "./props-shape";
import type { GraphicNode } from "./collector";

const hasOwnProperty = Object.prototype.hasOwnProperty;

function mergeProps(
  target: Record<string, unknown> | undefined,
  keys: readonly string[],
  props: Record<string, unknown>,
): Record<string, unknown> | undefined {
  for (const key of keys) {
    const value = props[key];
    if (value !== undefined) {
      (target ??= {})[key] = value;
    }
  }
  return target;
}

function buildNestedProps(
  source: unknown,
  props: Record<string, unknown>,
  keys: readonly string[],
  transition: unknown,
  extraKeys?: readonly string[],
): Record<string, unknown> | undefined {
  const nested = source as Record<string, unknown> | undefined;
  let result = nested && Object.keys(nested).length > 0 ? { ...nested } : undefined;
  result = mergeProps(result, keys, props);
  if (extraKeys) {
    result = mergeProps(result, extraKeys, props);
  }

  if (transition !== undefined) {
    (result ??= {}).transition = transition;
  }

  return result;
}

function toEventHandler(value: unknown, once: boolean): EventHandler | undefined {
  const invoke = createEventInvoker(value);
  if (!invoke || !once) {
    return invoke;
  }

  let called = false;
  return (...args: unknown[]): void => {
    if (called) {
      return;
    }
    called = true;
    invoke(...args);
  };
}

function mergeHandlers(node: GraphicNode, target: Record<string, unknown>): void {
  const { handlers } = node;
  let merged = false;

  if (node.handlerCache) {
    for (const key of node.handlerCache.keys()) {
      if (!hasOwnProperty.call(handlers, key)) {
        node.handlerCache.delete(key);
      }
    }
  }

  for (const key in handlers) {
    if (!hasOwnProperty.call(handlers, key)) {
      continue;
    }
    const value = handlers[key];
    const descriptor = parseOnEvent(key);
    if (!descriptor) {
      continue;
    }

    const cached = node.handlerCache?.get(key);
    const reused = cached !== undefined && cached.source === value && hasEventHandler(value);
    const handler = reused ? cached.handler : toEventHandler(value, descriptor.once);
    if (!handler) {
      node.handlerCache?.delete(key);
      continue;
    }
    if (!reused) {
      (node.handlerCache ??= new Map()).set(key, { source: value, handler });
    }

    const eventKey = `on${descriptor.event.toLowerCase()}`;
    const existing = target[eventKey] as EventHandler | undefined;
    merged = true;
    if (!existing) {
      target[eventKey] = handler;
      continue;
    }

    target[eventKey] = (...args: unknown[]): void => {
      existing(...args);
      handler(...args);
    };
  }

  if (!merged) {
    node.handlerCache = undefined;
  }
}

function toElement(node: GraphicNode, children?: Option[]): Option {
  const { type, id, props } = node;
  const shapeKeys: readonly string[] | undefined =
    SHAPE_KEYS_BY_TYPE[type as keyof typeof SHAPE_KEYS_BY_TYPE];
  const styleKeys: readonly string[] | undefined = shapeKeys
    ? PATH_STYLE_KEYS
    : STYLE_KEYS_BY_TYPE[type as keyof typeof STYLE_KEYS_BY_TYPE];
  const out: Record<string, unknown> = {
    type,
    id,
  };

  for (const key of COMMON_PROP_KEYS) {
    const value = props[key];
    if (value !== undefined && !shapeKeys?.includes(key) && !styleKeys?.includes(key)) {
      out[key] = value;
    }
  }
  if (shapeKeys) {
    mergeProps(out, PATH_PROP_KEYS, props);
  }

  mergeHandlers(node, out);

  if (type === "group") {
    mergeProps(out, GROUP_PROP_KEYS, props);
    if (children?.length) {
      out.children = children;
    }
    return out as Option;
  }

  mergeProps(out, DISPLAYABLE_PROP_KEYS, props);

  const shape = shapeKeys
    ? buildNestedProps(props.shape, props, shapeKeys, props.shapeTransition)
    : undefined;
  if (shape) {
    out.shape = shape;
  }

  const style = buildNestedProps(
    props.style,
    props,
    COMMON_STYLE_KEYS,
    props.styleTransition,
    styleKeys,
  );
  if (style) {
    out.style = style;
  }

  return out as Option;
}

export function buildOption(nodes: Iterable<GraphicNode>, rootId: string): Option {
  const byParent = new Map<string | null, GraphicNode[]>();
  let occupiedRootIds: Set<string> | undefined;

  for (const node of nodes) {
    if (node.id.startsWith(rootId)) {
      (occupiedRootIds ??= new Set()).add(node.id);
    }
    const list = byParent.get(node.parentId);
    if (list) {
      list.push(node);
      continue;
    }
    byParent.set(node.parentId, [node]);
  }

  while (occupiedRootIds?.has(rootId)) {
    rootId += "_";
  }

  for (const list of byParent.values()) {
    if (list.length > 1) {
      list.sort((a, b) => a.order - b.order);
    }
  }

  const childrenOf = (parentId: string | null): Option[] | undefined =>
    byParent.get(parentId)?.map((node) => {
      if (node.type !== "group") {
        return toElement(node);
      }
      return toElement(node, childrenOf(node.id));
    });

  return {
    graphic: {
      elements: [
        {
          type: "group",
          id: rootId,
          $action: "replace",
          children: childrenOf(null) ?? [],
        },
      ],
    },
  } as Option;
}
