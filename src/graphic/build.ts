import type { Option } from "../types";
import { createEventInvoker, parseOnEvent } from "../utils";
import type { EventHandler } from "../utils";
import { BASE_STYLE_KEYS, COMMON_PROP_KEYS, STYLE_KEYS_BY_TYPE } from "./props-common";
import { SHAPE_KEYS_BY_TYPE } from "./props-shape";
import type { GraphicNode } from "./collector";

const EMPTY_PROP_KEYS: readonly string[] = [];
const hasOwnProperty = Object.prototype.hasOwnProperty;

function mergeProps(
  target: Record<string, unknown>,
  keys: readonly string[],
  props: Record<string, unknown>,
): void {
  for (const key of keys) {
    if (props[key] !== undefined) {
      target[key] = props[key];
    }
  }
}

function buildStyle(
  props: Record<string, unknown>,
  extraKeys: readonly string[],
): Record<string, unknown> | undefined {
  const style = { ...(props.style as Record<string, unknown> | undefined) };
  mergeProps(style, BASE_STYLE_KEYS, props);
  mergeProps(style, extraKeys, props);

  if (props.styleTransition !== undefined) {
    style.transition = props.styleTransition;
  }

  return Object.keys(style).length > 0 ? style : undefined;
}

function buildShape(
  props: Record<string, unknown>,
  shapeKeys: readonly string[],
): Record<string, unknown> | undefined {
  const shape = { ...(props.shape as Record<string, unknown> | undefined) };
  mergeProps(shape, shapeKeys, props);

  if (props.shapeTransition !== undefined) {
    shape.transition = props.shapeTransition;
  }

  return Object.keys(shape).length > 0 ? shape : undefined;
}

function buildCommon(
  props: Record<string, unknown>,
  shapeKeys: readonly string[],
  styleKeys: readonly string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const key of COMMON_PROP_KEYS) {
    if (shapeKeys.includes(key) || styleKeys.includes(key)) {
      continue;
    }

    if (props[key] !== undefined) {
      out[key] = props[key];
    }
  }

  return out;
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
  const { handlers, handlerCache } = node;
  let out: Record<string, EventHandler> | undefined;

  for (const key of handlerCache.keys()) {
    if (!hasOwnProperty.call(handlers, key)) {
      handlerCache.delete(key);
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

    const cached = handlerCache.get(key);
    const handler =
      cached && cached.source === value ? cached.handler : toEventHandler(value, descriptor.once);
    if (!handler) {
      handlerCache.delete(key);
      continue;
    }
    handlerCache.set(key, { source: value, handler });

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

  return out;
}

function toElement(node: GraphicNode, children?: Option[]): Option {
  const { type, id, props } = node;
  const shapeKeys = SHAPE_KEYS_BY_TYPE[type as keyof typeof SHAPE_KEYS_BY_TYPE] ?? EMPTY_PROP_KEYS;
  const styleKeys = STYLE_KEYS_BY_TYPE[type as keyof typeof STYLE_KEYS_BY_TYPE] ?? EMPTY_PROP_KEYS;
  const out: Record<string, unknown> = {
    type,
    id,
  };

  Object.assign(out, buildCommon(props, shapeKeys, styleKeys));

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

  const shape = buildShape(props, shapeKeys);
  if (shape) {
    out.shape = shape;
  }

  const style = buildStyle(props, styleKeys);
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
    list.sort((a, b) => a.order - b.order);
  }

  const childrenOf = (parentId: string | null): Option[] => {
    const list = byParent.get(parentId) ?? [];
    return list.map((node) => {
      if (node.type !== "group") {
        return toElement(node);
      }
      return toElement(node, childrenOf(node.id));
    });
  };

  return {
    graphic: {
      elements: [
        {
          type: "group",
          id: rootId,
          $action: "replace",
          children: childrenOf(null),
        },
      ],
    },
  } as Option;
}
