import type { Option } from "../types";
import {
  COMMON_PROP_KEYS,
  IMAGE_STYLE_KEYS,
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

function buildInfo(node: GraphicNode): unknown {
  const hasHandlers = Object.keys(node.handlers).length > 0;
  const raw = node.props.info;

  if (!hasHandlers && raw === undefined) {
    return undefined;
  }

  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return { ...(raw as Record<string, unknown>), __veGraphicId: node.id };
  }

  if (raw !== undefined) {
    return { value: raw, __veGraphicId: node.id };
  }

  return { __veGraphicId: node.id };
}

function toElement(node: GraphicNode, children?: Option[]): Option {
  const out: Record<string, unknown> = {
    type: node.type,
    id: node.id,
  };

  const common: Record<string, unknown> = {};
  mergeProps(common, COMMON_PROP_KEYS, node.props);

  const shapeKeys = SHAPE_KEYS_BY_TYPE[node.type as keyof typeof SHAPE_KEYS_BY_TYPE];
  if (shapeKeys) {
    shapeKeys.forEach((key) => {
      delete common[key];
    });
  }
  if (node.type === "image") {
    IMAGE_STYLE_KEYS.forEach((key) => {
      delete common[key];
    });
  }

  Object.assign(out, common);
  const info = buildInfo(node);

  if (node.type === "group") {
    if (children?.length) {
      out.children = children;
    }
    if (info !== undefined) {
      out.info = info;
    }
    return out as Option;
  }

  const shape = buildShape(node.type, node.props);
  if (shape) {
    out.shape = shape;
  }

  const styleKeys =
    node.type === "text" ? TEXT_STYLE_KEYS : node.type === "image" ? IMAGE_STYLE_KEYS : [];
  const style = buildStyle(node.props, styleKeys);
  if (style) {
    out.style = style;
  }

  if (info !== undefined) {
    out.info = info;
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
