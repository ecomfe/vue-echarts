import {
  defineComponent,
  getCurrentInstance,
  inject,
  onUnmounted,
  provide,
  shallowRef,
  toRaw,
  unref,
} from "vue";
import type { PropType } from "vue";

import { warn } from "../utils";
import { GRAPHIC_COLLECTOR_KEY, GRAPHIC_ORDER_KEY, GRAPHIC_PARENT_ID_KEY } from "./context";

type AnyProps = Record<string, unknown>;

const commonProps = {
  id: [String, Number] as PropType<string | number>,
  left: [String, Number] as PropType<string | number>,
  right: [String, Number] as PropType<string | number>,
  top: [String, Number] as PropType<string | number>,
  bottom: [String, Number] as PropType<string | number>,
  width: [String, Number] as PropType<string | number>,
  height: [String, Number] as PropType<string | number>,
  x: Number,
  y: Number,
  cx: Number,
  cy: Number,
  r: Number,
  r0: Number,
  x1: Number,
  y1: Number,
  x2: Number,
  y2: Number,
  cpx1: Number,
  cpy1: Number,
  cpx2: Number,
  cpy2: Number,
  startAngle: Number,
  endAngle: Number,
  percent: Number,
  points: Array as PropType<Array<[number, number]>>,
  smooth: [Boolean, Number] as PropType<boolean | number>,
  smoothConstraint: Boolean,
  paths: Array as PropType<unknown[]>,
  clockwise: Boolean,
  cornerRadius: [Number, Array] as PropType<number | number[]>,
  rotation: Number,
  scaleX: Number,
  scaleY: Number,
  originX: Number,
  originY: Number,
  bounding: String,
  z: Number,
  zlevel: Number,
  silent: Boolean,
  draggable: [Boolean, String] as PropType<boolean | "horizontal" | "vertical">,
  cursor: String,
  ignore: Boolean,
  invisible: Boolean,
  info: null as unknown as PropType<unknown>,
  focus: String,
  blurScope: String,
  transition: [String, Array] as PropType<string | string[]>,
  enterFrom: Object as PropType<Record<string, unknown>>,
  leaveTo: Object as PropType<Record<string, unknown>>,
  enterAnimation: Object as PropType<Record<string, unknown>>,
  updateAnimation: Object as PropType<Record<string, unknown>>,
  leaveAnimation: Object as PropType<Record<string, unknown>>,
  keyframeAnimation: Object as PropType<Record<string, unknown>>,
  shape: Object as PropType<Record<string, unknown>>,
  style: Object as PropType<Record<string, unknown>>,
  shapeTransition: [String, Array] as PropType<string | string[]>,
  styleTransition: [String, Array] as PropType<string | string[]>,
  fill: String,
  stroke: String,
  lineWidth: Number,
  lineDash: [String, Array] as PropType<string | number[]>,
  lineDashOffset: Number,
  lineCap: String,
  lineJoin: String,
  miterLimit: Number,
  shadowBlur: Number,
  shadowOffsetX: Number,
  shadowOffsetY: Number,
  shadowColor: String,
  opacity: Number,
  blend: String,
  text: String,
  font: String,
  textFill: String,
  textStroke: String,
  textStrokeWidth: Number,
  textAlign: String,
  textVerticalAlign: String,
  textLineHeight: Number,
  textShadowBlur: Number,
  textShadowOffsetX: Number,
  textShadowOffsetY: Number,
  textShadowColor: String,
  image: [String, HTMLImageElement, HTMLCanvasElement, HTMLVideoElement] as PropType<
    string | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement
  >,
} as const;

function resolveId(
  props: { id?: string | number },
  instance: NonNullable<ReturnType<typeof getCurrentInstance>>,
): string {
  if (props.id != null) {
    return String(props.id);
  }
  const key = instance?.vnode.key;
  if (key != null) {
    return String(key);
  }
  return `__ve_graphic_${instance.uid}`;
}

function resolveIdentity(
  props: { id?: string | number },
  instance: NonNullable<ReturnType<typeof getCurrentInstance>>,
): string | null {
  if (props.id != null) {
    return `id:${String(props.id)}`;
  }
  const key = instance.vnode.key;
  if (key != null) {
    return `key:${String(key)}`;
  }
  return null;
}

function cloneProps(props: AnyProps): AnyProps {
  const raw = toRaw(props) as AnyProps;
  const clone: AnyProps = { ...raw };
  if (raw.shape && typeof raw.shape === "object") {
    clone.shape = toRaw(raw.shape as AnyProps);
  }
  if (raw.style && typeof raw.style === "object") {
    clone.style = toRaw(raw.style as AnyProps);
  }
  return clone;
}

function extractHandlers(attrs: AnyProps): AnyProps {
  const handlers: AnyProps = {};
  for (const key of Object.keys(attrs)) {
    if (key.startsWith("on")) {
      handlers[key] = attrs[key];
    }
  }
  return handlers;
}

function createGraphicComponent(name: string, type: string) {
  return defineComponent({
    name,
    inheritAttrs: false,
    props: commonProps,
    setup(props, { attrs, slots }) {
      const instance = getCurrentInstance()!;
      const collector = inject(GRAPHIC_COLLECTOR_KEY, null);
      const parentIdRef = inject(GRAPHIC_PARENT_ID_KEY, null);
      const orderRef = inject(GRAPHIC_ORDER_KEY, null);

      if (!collector) {
        warn(`\`${name}\` must be used inside \`#graphic\` slot.`);
        return () => null;
      }

      const graphicCollector = collector;
      const currentId = shallowRef<string | null>(null);

      function register(): void {
        const nextId = resolveId(props, instance);
        if (!props.id && instance.vnode.key == null) {
          graphicCollector.warnOnce(
            `missing-id:${instance.uid}`,
            `\`${name}\` is missing \`id\` and \`key\`. Updates might be unstable in \`v-for\`.`,
          );
        }
        if (currentId.value && currentId.value !== nextId) {
          graphicCollector.unregister(currentId.value, instance.uid);
        }
        currentId.value = nextId;
        const identity = resolveIdentity(props, instance);
        const hintedOrder = identity != null ? unref(orderRef)?.get(identity) : undefined;

        graphicCollector.register({
          id: nextId,
          type,
          parentId: parentIdRef ? unref(parentIdRef) : null,
          order: hintedOrder,
          props: cloneProps(props as AnyProps),
          handlers: extractHandlers(attrs as AnyProps),
          sourceId: instance.uid,
        });
      }

      onUnmounted(() => {
        if (currentId.value) {
          graphicCollector.unregister(currentId.value, instance.uid);
        }
      });

      if (type === "group") {
        const providedParent = shallowRef<string | null>(null);
        provide(GRAPHIC_PARENT_ID_KEY, providedParent);

        return () => {
          register();
          providedParent.value = currentId.value;
          return slots.default?.() ?? null;
        };
      }

      return () => {
        register();
        return null;
      };
    },
  });
}

export const GGroup = createGraphicComponent("GGroup", "group");
export const GRect = createGraphicComponent("GRect", "rect");
export const GCircle = createGraphicComponent("GCircle", "circle");
export const GText = createGraphicComponent("GText", "text");
export const GLine = createGraphicComponent("GLine", "line");
export const GPolyline = createGraphicComponent("GPolyline", "polyline");
export const GPolygon = createGraphicComponent("GPolygon", "polygon");
export const GImage = createGraphicComponent("GImage", "image");
export const GSector = createGraphicComponent("GSector", "sector");
export const GRing = createGraphicComponent("GRing", "ring");
export const GArc = createGraphicComponent("GArc", "arc");
export const GBezierCurve = createGraphicComponent("GBezierCurve", "bezierCurve");
export const GCompoundPath = createGraphicComponent("GCompoundPath", "compoundPath");
