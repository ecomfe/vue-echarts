import {
  BASE_STYLE_KEYS,
  IMAGE_STYLE_KEYS,
  SHAPE_KEYS_BY_TYPE,
  TEXT_STYLE_KEYS,
} from "./constants";
import type { GraphicNode } from "./collector";

export function mergeProps(
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

export function buildStyle(
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

export function buildShape(
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

export function isTextGraphic(type: string): boolean {
  return type === "text";
}

export function isImageGraphic(type: string): boolean {
  return type === "image";
}

export function isGroupGraphic(type: string): boolean {
  return type === "group";
}

export function pruneCommonPropsByType(
  type: string,
  common: Record<string, unknown>,
): Record<string, unknown> {
  const shapeKeys = SHAPE_KEYS_BY_TYPE[type];
  if (shapeKeys) {
    shapeKeys.forEach((key) => {
      delete common[key];
    });
  }
  if (isImageGraphic(type)) {
    IMAGE_STYLE_KEYS.forEach((key) => {
      delete common[key];
    });
  }
  return common;
}

export function styleKeysByType(type: string): readonly string[] {
  if (isTextGraphic(type)) {
    return TEXT_STYLE_KEYS;
  }
  if (isImageGraphic(type)) {
    return IMAGE_STYLE_KEYS;
  }
  return [];
}
