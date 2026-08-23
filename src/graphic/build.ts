import type { Option } from "../types";
import { createEventInvoker, parseOnEvent } from "../utils";
import type { EventHandler } from "../utils";
import { BASE_STYLE_KEYS, COMMON_PROP_KEYS, STYLE_KEYS_BY_TYPE } from "./props-common";
import { SHAPE_KEYS_BY_TYPE } from "./props-shape";
import type { GraphicNode } from "./collector";

const EMPTY_PROP_KEYS: readonly string[] = [];
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

function buildHandlers(node: GraphicNode): Record<string, EventHandler> | undefined {
  const { handlers } = node;
  let out: Record<string, EventHandler> | undefined;

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
    const handler =
      cached && cached.source === value ? cached.handler : toEventHandler(value, descriptor.once);
    if (!handler) {
      node.handlerCache?.delete(key);
      continue;
    }
    (node.handlerCache ??= new Map()).set(key, { source: value, handler });

    const eventKey = `on${descriptor.event}`;
    const result = (out ??= {});
    const existing = result[eventKey];
    if (!existing) {
      result[eventKey] = handler;
      continue;
    }

    result[eventKey] = (...args: unknown[]): void => {
      existing(...args);
      handler(...args);
    };
  }

  if (!out) {
    node.handlerCache = undefined;
  }

  return out;
}

function toElement(node: GraphicNode, children?: Option[]): Option {
  const { type, id, props } = node;
  const shapeKeys: readonly string[] =
    SHAPE_KEYS_BY_TYPE[type as keyof typeof SHAPE_KEYS_BY_TYPE] ?? EMPTY_PROP_KEYS;
  const styleKeys: readonly string[] =
    STYLE_KEYS_BY_TYPE[type as keyof typeof STYLE_KEYS_BY_TYPE] ?? EMPTY_PROP_KEYS;
  const out: Record<string, unknown> = {
    type,
    id,
  };

  for (const key of COMMON_PROP_KEYS) {
    const value = props[key];
    if (value !== undefined && !shapeKeys.includes(key) && !styleKeys.includes(key)) {
      out[key] = value;
    }
  }

  const handlers = buildHandlers(node);
  if (handlers) {
    Object.assign(out, handlers);
  }

  if (type === "group") {
    if (children?.length) {
      out.children = children;
    }
    return out as Option;
  }

  const shape = buildNestedProps(props.shape, props, shapeKeys, props.shapeTransition);
  if (shape) {
    out.shape = shape;
  }

  const style = buildNestedProps(
    props.style,
    props,
    BASE_STYLE_KEYS,
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

  for (const node of nodes) {
    const list = byParent.get(node.parentId);
    if (list) {
      list.push(node);
      continue;
    }
    byParent.set(node.parentId, [node]);
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
