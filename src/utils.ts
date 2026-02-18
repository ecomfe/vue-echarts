import { warn as vueWarn } from "vue";

export type AttrMap = Record<string, unknown>;

export function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

// Copied from
// https://github.com/vuejs/vue-next/blob/5a7a1b8293822219283d6e267496bec02234b0bc/packages/shared/src/index.ts#L40-L41
const onRE = /^on[^a-z]/;
export const isOn = (key: string): boolean => onRE.test(key);

export type ParsedOnEvent = {
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

export function omitOn(attrs: AttrMap): AttrMap {
  const result: AttrMap = {};
  for (const key in attrs) {
    if (!isOn(key)) {
      result[key] = attrs[key];
    }
  }

  return result;
}

export function isValidArrayIndex(key: string): boolean {
  const num = Number(key);
  return Number.isInteger(num) && num >= 0 && num < Math.pow(2, 32) - 1 && String(num) === key;
}

export function isSameSet<T>(a: T[], b: T[]): boolean {
  const setA = new Set(a);
  const setB = new Set(b);

  if (setA.size !== setB.size) {
    return false;
  }

  for (const val of setA) {
    if (!setB.has(val)) {
      return false;
    }
  }

  return true;
}

export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

const LOG_PREFIX = "[vue-echarts]";

const warned = new Set<string>();

export type WarnOptions = {
  onceKey?: string;
  onceStore?: Set<string>;
};

export type Warn = (message: string, options?: WarnOptions) => void;

export const warn: Warn = (message, options) => {
  if (options?.onceKey) {
    const store = options.onceStore ?? warned;
    if (store.has(options.onceKey)) {
      return;
    }
    store.add(options.onceKey);
  }

  vueWarn(`${LOG_PREFIX} ${message}`);
};

export function __resetWarnState(): void {
  warned.clear();
}
