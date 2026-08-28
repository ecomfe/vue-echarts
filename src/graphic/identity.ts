// Vue distinguishes numeric and string keys, while ECharts stringifies element ids.
function toOrderKey(key: PropertyKey | null | undefined): PropertyKey | undefined {
  return typeof key === "string" ? `key:${key}` : (key ?? undefined);
}

export function resolveIdentity(
  propsId: string | number | undefined,
  vnodeKey: PropertyKey | null | undefined,
  uid: number,
): { id: string; orderKey?: PropertyKey } {
  if (propsId != null) {
    const id = String(propsId);
    return { id, orderKey: `id:${id}` };
  }
  const orderKey = toOrderKey(vnodeKey);
  if (orderKey !== undefined) {
    return {
      id: typeof vnodeKey === "string" ? vnodeKey : `__ve_graphic_${uid}`,
      orderKey,
    };
  }
  return { id: `__ve_graphic_${uid}` };
}

export function resolveOrderKey(
  propsId: unknown,
  vnodeKey: PropertyKey | null | undefined,
): PropertyKey | null {
  if (propsId != null) {
    return `id:${String(propsId)}`;
  }
  return toOrderKey(vnodeKey) ?? null;
}
