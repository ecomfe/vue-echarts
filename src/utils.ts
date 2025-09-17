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

export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}
