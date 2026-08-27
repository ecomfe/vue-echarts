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
  TEXT_ATTACHMENT_PROP_KEYS,
  TEXT_COMMON_STYLE_KEYS,
} from "./props-common";
import type { GraphicTextAttachmentPropKey } from "./props-common";
import { SHAPE_KEYS_BY_TYPE } from "./props-shape";
import type { GraphicNode } from "./collector";
import { GRAPHIC_EVENTS } from "./types";

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
  return (...args: unknown[]): unknown => {
    if (called) {
      return;
    }
    called = true;
    return invoke(...args);
  };
}

function mergeHandlers(node: GraphicNode, target: Record<string, unknown>): void {
  const { handlers } = node;

  if (node.handlerCache) {
    for (const key of node.handlerCache.keys()) {
      if (!Object.hasOwn(handlers, key)) {
        node.handlerCache.delete(key);
      }
    }
  }

  for (const key of Object.keys(handlers)) {
    const value = handlers[key];
    const descriptor = parseOnEvent(key);
    if (!descriptor) {
      continue;
    }
    const event = descriptor.event.toLowerCase();
    if (!Object.hasOwn(GRAPHIC_EVENTS, event)) {
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

    const eventKey = `on${event}`;
    const existing = target[eventKey] as EventHandler | undefined;
    if (!existing) {
      target[eventKey] = handler;
      continue;
    }

    target[eventKey] = (...args: unknown[]): unknown => {
      const result = existing(...args);
      return handler(...args) || result;
    };
  }
}

function toElement(node: GraphicNode, children?: Option[]): Option {
  const { type, id, props } = node;
  const shapeKeys: readonly string[] | undefined =
    SHAPE_KEYS_BY_TYPE[type as keyof typeof SHAPE_KEYS_BY_TYPE];
  const styleKeys: readonly string[] | undefined = shapeKeys
    ? PATH_STYLE_KEYS
    : STYLE_KEYS_BY_TYPE[type as keyof typeof STYLE_KEYS_BY_TYPE];
  const commonStyleKeys = type === "text" ? TEXT_COMMON_STYLE_KEYS : COMMON_STYLE_KEYS;
  const out: Record<string, unknown> = {
    type,
    id,
  };

  for (const key of COMMON_PROP_KEYS) {
    const value = props[key];
    if (
      value !== undefined &&
      !(
        type === "text" && TEXT_ATTACHMENT_PROP_KEYS.includes(key as GraphicTextAttachmentPropKey)
      ) &&
      !shapeKeys?.includes(key) &&
      !styleKeys?.includes(key)
    ) {
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
    commonStyleKeys,
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
    list.sort((a, b) => a.order - b.order);
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
