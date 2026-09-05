export function resolveIdentity(
  propsId: string | number | undefined,
  vnodeKey: PropertyKey | null | undefined,
  uid: number,
): string {
  if (propsId != null) {
    return String(propsId);
  }
  // Vue distinguishes numeric and string keys, while ECharts stringifies IDs.
  return typeof vnodeKey === "string" ? vnodeKey : `__ve_graphic_${uid}`;
}
