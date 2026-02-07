import type { Option } from "../types";
import { SHAPE_KEYS_BY_TYPE } from "./constants";
import type { GraphicNode, GraphicSnapshot } from "./collector";
import { pickCommonProps } from "./collector";
import {
  buildInfo,
  buildShape,
  buildStyle,
  isGroupGraphic,
  pruneCommonPropsByType,
  styleKeysByType,
} from "./build-helpers";

type BuildResult = {
  option: Option;
  snapshot: GraphicSnapshot;
};

function buildElementOption(node: GraphicNode, children: Option[] | undefined): Option {
  const element: Record<string, unknown> = {
    type: node.type,
    id: node.id,
  };

  const common = pruneCommonPropsByType(node.type, pickCommonProps(node.props));
  Object.assign(element, common);

  if (isGroupGraphic(node.type)) {
    if (children) {
      element.children = children;
    }
    const info = buildInfo(node);
    if (info !== undefined) {
      element.info = info;
    }
    return element as Option;
  }

  const shapeKeys = SHAPE_KEYS_BY_TYPE[node.type];
  if (shapeKeys) {
    const shape = buildShape(node.type, node.props);
    if (shape) {
      element.shape = shape;
    }
  }

  const style = buildStyle(node.props, styleKeysByType(node.type));
  if (style) {
    element.style = style;
  }

  const info = buildInfo(node);
  if (info !== undefined) {
    element.info = info;
  }

  return element as Option;
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

  const buildChildren = (parentId: string | null): Option[] => {
    const children = byParent.get(parentId) ?? [];
    return children.map((child) =>
      buildElementOption(child, child.type === "group" ? buildChildren(child.id) : undefined),
    );
  };

  const root: Record<string, unknown> = {
    type: "group",
    id: rootId,
    $action: "replace",
    children: buildChildren(null),
  };

  return {
    option: {
      graphic: {
        elements: [root],
      },
    } as Option,
    snapshot,
  };
}
