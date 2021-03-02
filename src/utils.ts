type Attrs = {
  [key: string]: unknown;
};

export function filterObjectValue(
  source: Attrs,
  predicate: (key: unknown) => boolean
) {
  const target: Attrs = {};
  for (const key in source) {
    if (predicate(source[key])) {
      target[key] = source[key];
    }
  }
  return target;
}
