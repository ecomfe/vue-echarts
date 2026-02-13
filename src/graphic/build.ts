import type { Option } from "../types";
import { parseOnEvent } from "../utils";
import { BASE_STYLE_KEYS, COMMON_PROP_KEYS, STYLE_KEYS_BY_TYPE } from "./props-common";
import { SHAPE_KEYS_BY_TYPE } from "./props-shape";
import type { GraphicNode } from "./collector";

const EMPTY_PROP_KEYS: readonly string[] = [];

function resolveShapeKeys(type: string): readonly string[] {
  return SHAPE_KEYS_BY_TYPE[type as keyof typeof SHAPE_KEYS_BY_TYPE] ?? EMPTY_PROP_KEYS;
}

function resolveStyleKeys(type: string): readonly string[] {
  return STYLE_KEYS_BY_TYPE[type as keyof typeof STYLE_KEYS_BY_TYPE] ?? EMPTY_PROP_KEYS;
}

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

  return Object.keys(style).length ? style : undefined;
}

function buildShape(
  type: string,
  props: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const shape = { ...(props.shape as Record<string, unknown> | undefined) };
  mergeProps(shape, resolveShapeKeys(type), props);

  if (props.shapeTransition !== undefined) {
    shape.transition = props.shapeTransition;
  }

  return Object.keys(shape).length ? shape : undefined;
}

function buildCommon(
  type: string,
  props: Record<string, unknown>,
  styleKeys: readonly string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const shapeKeys = resolveShapeKeys(type);

  for (const key of COMMON_PROP_KEYS) {
    if (shapeKeys.includes(key)) {
      continue;
    }
    if (styleKeys.includes(key)) {
      continue;
    }
    if (props[key] !== undefined) {
      out[key] = props[key];
    }
  }

  return out;
}

type GraphicEventHandler = (...args: unknown[]) => void;

function toEventHandler(value: unknown, once: boolean): GraphicEventHandler | undefined {
  const handlers: GraphicEventHandler[] = [];

  if (typeof value === "function") {
    handlers.push(value as GraphicEventHandler);
  } else if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === "function") {
        handlers.push(item as GraphicEventHandler);
      }
    }
  }

  if (handlers.length === 0) {
    return undefined;
  }

  let handler: GraphicEventHandler;
  if (handlers.length === 1) {
    handler = handlers[0];
  } else {
    handler = (...args: unknown[]) => {
      for (const item of handlers) {
        item(...args);
      }
    };
  }

  if (!once) {
    return handler;
  }

  let called = false;
  return (...args: unknown[]) => {
    if (called) {
      return;
    }
    called = true;
    handler(...args);
  };
}

function buildHandlers(
  handlers: Record<string, unknown>,
): Record<string, GraphicEventHandler> | undefined {
  const out: Record<string, GraphicEventHandler> = {};

  for (const [key, value] of Object.entries(handlers)) {
    const descriptor = parseOnEvent(key);
    if (!descriptor) {
      continue;
    }

    const handler = toEventHandler(value, descriptor.once);
    if (!handler) {
      continue;
    }

    const eventKey = `on${descriptor.event}`;
    const existing = out[eventKey];
    if (!existing) {
      out[eventKey] = handler;
      continue;
    }

    out[eventKey] = (...args: unknown[]) => {
      existing(...args);
      handler(...args);
    };
  }

  return Object.keys(out).length > 0 ? out : undefined;
}

function buildInfo(props: Record<string, unknown>): unknown {
  return props.info;
}

function toElement(node: GraphicNode, children?: Option[]): Option {
  const { type, id, props } = node;
  const styleKeys = resolveStyleKeys(type);
  const out: Record<string, unknown> = {
    type,
    id,
  };

  Object.assign(out, buildCommon(type, props, styleKeys));
  const handlers = buildHandlers(node.handlers);
  if (handlers) {
    Object.assign(out, handlers);
  }
  const info = buildInfo(props);
  if (info !== undefined) {
    out.info = info;
  }

  if (type === "group") {
    if (children?.length) {
      out.children = children;
    }
    return out as Option;
  }

  const shape = buildShape(type, props);
  if (shape) {
    out.shape = shape;
  }

  const style = buildStyle(props, styleKeys);
  if (style) {
    out.style = style;
  }

  return out as Option;
}

export function buildGraphicOption(nodes: Iterable<GraphicNode>, rootId: string): Option {
  const byParent = new Map<string | null, GraphicNode[]>();

  for (const node of nodes) {
    const list = byParent.get(node.parentId);
    if (list) {
      list.push(node);
    } else {
      byParent.set(node.parentId, [node]);
    }
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
