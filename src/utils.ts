import type { MaybeRefOrGetter } from "./types";
import { unref } from "vue";

type Attrs = Record<string, any>;

// Copied from
// https://github.com/vuejs/vue-next/blob/5a7a1b8293822219283d6e267496bec02234b0bc/packages/shared/src/index.ts#L40-L41
const onRE = /^on[^a-z]/;
export const isOn = (key: string): boolean => onRE.test(key);

export function omitOn(attrs: Attrs): Attrs {
  const result: Attrs = {};
  for (const key in attrs) {
    if (!isOn(key)) {
      result[key] = attrs[key];
    }
  }

  return result;
}

// Copied from
// https://github.com/vuejs/core/blob/3cb4db21efa61852b0541475b4ddf57fdec4c479/packages/shared/src/general.ts#L49-L50
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
const isFunction = (val: unknown): val is Function => typeof val === "function";

// Copied from
// https://github.com/vuejs/core/blob/3cb4db21efa61852b0541475b4ddf57fdec4c479/packages/reactivity/src/ref.ts#L246-L248
export function toValue<T>(source: MaybeRefOrGetter<T>): T {
  return isFunction(source) ? source() : unref(source);
}

export function isValidArrayIndex(key: string): boolean {
  const num = Number(key);
  return (
    Number.isInteger(num) &&
    num >= 0 &&
    num < Math.pow(2, 32) - 1 &&
    String(num) === key
  );
}

export function isSameSet<T>(a: T[], b: T[]): boolean {
  const setA = new Set(a);
  const setB = new Set(b);

  if (setA.size !== setB.size) return false;

  for (const val of setA) {
    if (!setB.has(val)) return false;
  }

  return true;
}
