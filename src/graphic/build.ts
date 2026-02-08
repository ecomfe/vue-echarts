import type { Option } from "../types";
import { SHAPE_KEYS_BY_TYPE } from "./constants";
import type { GraphicNode } from "./collector";
import { pickCommonProps } from "./collector";
import {
  buildInfo,
  buildShape,
  buildStyle,
  isGroupGraphic,
  pruneCommonPropsByType,
  styleKeysByType,
} from "./build-helpers";

function toElement(node: GraphicNode, children?: Option[]): Option {
  const out: Record<string, unknown> = {
    type: node.type,
    id: node.id,
  };

  Object.assign(out, pruneCommonPropsByType(node.type, pickCommonProps(node.props)));

  if (isGroupGraphic(node.type)) {
    if (children?.length) {
      out.children = children;
    }
    const info = buildInfo(node);
    if (info !== undefined) {
      out.info = info;
    }
    return out as Option;
  }

  if (SHAPE_KEYS_BY_TYPE[node.type]) {
    const shape = buildShape(node.type, node.props);
    if (shape) {
      out.shape = shape;
    }
  }

  const style = buildStyle(node.props, styleKeysByType(node.type));
  if (style) {
    out.style = style;
  }

  const info = buildInfo(node);
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
