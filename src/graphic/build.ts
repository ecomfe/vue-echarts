import type { Option } from "../types";
import {
  BASE_STYLE_KEYS,
  IMAGE_STYLE_KEYS,
  SHAPE_KEYS_BY_TYPE,
  TEXT_STYLE_KEYS,
} from "./constants";
import type { GraphicNode, GraphicSnapshot } from "./collector";
import { pickCommonProps } from "./collector";

type BuildResult = {
  option: Option;
  snapshot: GraphicSnapshot;
};

function mergeProps(
  target: Record<string, unknown>,
  keys: readonly string[],
  props: Record<string, unknown>,
): void {
  keys.forEach((key) => {
    if (props[key] !== undefined) {
      target[key] = props[key];
    }
  });
}

function buildStyle(
  props: Record<string, unknown>,
  extraKeys: readonly string[] = [],
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
  type: string,
  props: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const shape = { ...(props.shape as Record<string, unknown> | undefined) };
  const shapeKeys = SHAPE_KEYS_BY_TYPE[type];
  if (shapeKeys) {
    mergeProps(shape, shapeKeys, props);
  }

  if (props.shapeTransition !== undefined) {
    shape.transition = props.shapeTransition;
  }

  return Object.keys(shape).length > 0 ? shape : undefined;
}

function buildElementOption(node: GraphicNode, children: Option[] | undefined): Option {
  const element: Record<string, unknown> = {
    type: node.type,
    id: node.id,
  };

  const common = pickCommonProps(node.props);
  const shapeKeys = SHAPE_KEYS_BY_TYPE[node.type];
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
  Object.assign(element, common);

  if (node.type === "group") {
    if (children) {
      element.children = children;
    }
    const info = buildInfo(node);
    if (info !== undefined) {
      element.info = info;
    }
    return element as Option;
  }

  if (node.type === "text") {
    const style = buildStyle(node.props, TEXT_STYLE_KEYS);
    if (style) {
      element.style = style;
    }
    const info = buildInfo(node);
    if (info !== undefined) {
      element.info = info;
    }
    return element as Option;
  }

  if (node.type === "image") {
    const style = buildStyle(node.props, IMAGE_STYLE_KEYS);
    if (style) {
      element.style = style;
    }
    const info = buildInfo(node);
    if (info !== undefined) {
      element.info = info;
    }
    return element as Option;
  }

  const shape = buildShape(node.type, node.props);
  if (shape) {
    element.shape = shape;
  }

  const style = buildStyle(node.props);
  if (style) {
    element.style = style;
  }

  const info = buildInfo(node);
  if (info !== undefined) {
    element.info = info;
  }

  return element as Option;
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

export function buildGraphicOption(nodes: Iterable<GraphicNode>, rootId: string): BuildResult {
  const byParent = new Map<string | null, GraphicNode[]>();
  const ids = new Set<string>();
  const parentById = new Map<string, string | null>();

  let hasDuplicateId = false;

  for (const node of nodes) {
    const list = byParent.get(node.parentId) ?? [];
    list.push(node);
    byParent.set(node.parentId, list);

    if (ids.has(node.id)) {
      hasDuplicateId = true;
    }
    ids.add(node.id);
    parentById.set(node.id, node.parentId);
  }

  for (const list of byParent.values()) {
    list.sort((a, b) => a.order - b.order);
  }

  const snapshot: GraphicSnapshot = { ids, parentById, hasDuplicateId };

  const shouldReplace = true;

  const buildChildren = (parentId: string | null): Option[] => {
    const children = byParent.get(parentId) ?? [];
    return children.map((child) =>
      buildElementOption(child, child.type === "group" ? buildChildren(child.id) : undefined),
    );
  };

  const root: Record<string, unknown> = {
    type: "group",
    id: rootId,
    children: buildChildren(null),
  };

  if (shouldReplace) {
    root.$action = "replace";
  }

  return {
    option: {
      graphic: {
        elements: [root],
      },
    } as Option,
    snapshot,
  };
}
