import type { Option } from "../types";
import {
  COMMON_PROP_KEYS,
  IMAGE_STYLE_KEYS,
  GRAPHIC_INFO_ID_KEY,
  SHAPE_KEYS_BY_TYPE,
  TEXT_STYLE_KEYS,
  BASE_STYLE_KEYS,
} from "./constants";
import type { GraphicNode } from "./collector";

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
  const keys = SHAPE_KEYS_BY_TYPE[type as keyof typeof SHAPE_KEYS_BY_TYPE];
  if (keys) {
    mergeProps(shape, keys, props);
  }

  if (props.shapeTransition !== undefined) {
    shape.transition = props.shapeTransition;
  }

  return Object.keys(shape).length ? shape : undefined;
}

function buildCommon(type: string, props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const shapeKeys = SHAPE_KEYS_BY_TYPE[type as keyof typeof SHAPE_KEYS_BY_TYPE] as
    | readonly string[]
    | undefined;
  const imageStyleKeys = IMAGE_STYLE_KEYS as readonly string[];

  for (const key of COMMON_PROP_KEYS) {
    if (shapeKeys?.includes(key)) {
      continue;
    }
    if (type === "image" && imageStyleKeys.includes(key)) {
      continue;
    }
    if (props[key] !== undefined) {
      out[key] = props[key];
    }
  }

  return out;
}

function buildInfo(node: GraphicNode): unknown {
  const { handlers, props, id } = node;
  const hasHandlers = Object.keys(handlers).length > 0;
  const raw = props.info;

  if (!hasHandlers && raw === undefined) {
    return undefined;
  }

  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return { ...(raw as Record<string, unknown>), [GRAPHIC_INFO_ID_KEY]: id };
  }

  if (raw !== undefined) {
    return { value: raw, [GRAPHIC_INFO_ID_KEY]: id };
  }

  return { [GRAPHIC_INFO_ID_KEY]: id };
}

function toElement(node: GraphicNode, children?: Option[]): Option {
  const { type, id, props } = node;
  const out: Record<string, unknown> = {
    type,
    id,
  };

  Object.assign(out, buildCommon(type, props));
  const info = buildInfo(node);
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

  let styleKeys: readonly string[] = [];
  if (type === "text") {
    styleKeys = TEXT_STYLE_KEYS;
  } else if (type === "image") {
    styleKeys = IMAGE_STYLE_KEYS;
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
    return list.map((node) =>
      toElement(node, node.type === "group" ? childrenOf(node.id) : undefined),
    );
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
