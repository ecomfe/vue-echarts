import { warn as vueWarn } from "vue";

export type AttrMap = Record<string, unknown>;
export type EventHandler = (...args: unknown[]) => unknown;

export function hasEventHandler(value: unknown): boolean {
  return typeof value === "function" || (Array.isArray(value) && value.length > 0);
}

export function createEventInvoker(value: unknown): EventHandler | undefined {
  if (typeof value === "function") {
    return value as EventHandler;
  }

  if (!Array.isArray(value) || value.length === 0) {
    return undefined;
  }

  return (...args: unknown[]): unknown => {
    let result: unknown;
    for (const handler of value.slice()) {
      result = handler(...args) || result;
    }
    return result;
  };
}

export function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

// Copied from
// https://github.com/vuejs/vue-next/blob/5a7a1b8293822219283d6e267496bec02234b0bc/packages/shared/src/index.ts#L40-L41
const onRE = /^on[^a-z]/;
export const isOn = (key: string): boolean => onRE.test(key);

type ParsedOnEvent = {
  event: string;
  once: boolean;
};

export function parseOnEvent(key: string): ParsedOnEvent | null {
  if (!isOn(key)) {
    return null;
  }

  let event = key.charAt(2).toLowerCase() + key.slice(3);
  const once = event.endsWith("Once");
  if (once) {
    event = event.slice(0, -4);
  }

  return { event, once };
}

export function isValidArrayIndex(key: string): boolean {
  const num = Number(key);
  return Number.isInteger(num) && num >= 0 && num < Math.pow(2, 32) - 1 && String(num) === key;
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value == null || typeof value !== "object") {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.prototype;
}

export function hasZeroDimension(width: number, height: number): boolean {
  return width === 0 || height === 0;
}

export function isIgnorableWatchChange(value: unknown, previous: unknown): boolean {
  if (Object.is(value, previous)) {
    return value === null || typeof value !== "object";
  }

  if (!isPlainObject(value) || !isPlainObject(previous)) {
    return false;
  }

  const keys = Object.keys(value);
  return (
    keys.length === Object.keys(previous).length &&
    keys.every((key) => Object.hasOwn(previous, key) && Object.is(value[key], previous[key]))
  );
}

const LOG_PREFIX = "[vue-echarts]";

export function warn(message: string): void {
  vueWarn(`${LOG_PREFIX} ${message}`);
}
