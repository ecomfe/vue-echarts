import { BASE_STYLE_KEYS, SHAPE_KEYS_BY_TYPE } from "./constants";
import type { GraphicNode } from "./collector";

export function mergeProps(
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

export function buildStyle(
  props: Record<string, unknown>,
  extraKeys: readonly string[],
): Record<string, unknown> | undefined {
  const out = { ...(props.style as Record<string, unknown> | undefined) };
  mergeProps(out, BASE_STYLE_KEYS, props);
  mergeProps(out, extraKeys, props);

  if (props.styleTransition !== undefined) {
    out.transition = props.styleTransition;
  }

  return Object.keys(out).length ? out : undefined;
}

export function buildShape(
  type: string,
  props: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const out = { ...(props.shape as Record<string, unknown> | undefined) };
  const keys = SHAPE_KEYS_BY_TYPE[type];
  if (keys) {
    mergeProps(out, keys, props);
  }

  if (props.shapeTransition !== undefined) {
    out.transition = props.shapeTransition;
  }

  return Object.keys(out).length ? out : undefined;
}

export function buildInfo(node: GraphicNode): unknown {
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
