export function resolveIdentity(
  propsId: string | number | undefined,
  vnodeKey: unknown,
  uid: number,
): { id: string; orderKey?: PropertyKey; missingIdentity: boolean } {
  if (propsId != null) {
    const id = String(propsId);
    return { id, orderKey: `id:${id}`, missingIdentity: false };
  }
  if (typeof vnodeKey === "symbol") {
    return { id: `__ve_graphic_${uid}`, orderKey: vnodeKey, missingIdentity: false };
  }
  if (vnodeKey != null) {
    const id = String(vnodeKey);
    return { id, orderKey: `key:${id}`, missingIdentity: false };
  }
  return { id: `__ve_graphic_${uid}`, missingIdentity: true };
}

export function resolveOrderKey(propsId: unknown, vnodeKey: unknown): PropertyKey | null {
  if (propsId != null) {
    return `id:${String(propsId)}`;
  }
  if (typeof vnodeKey === "symbol") {
    return vnodeKey;
  }
  if (vnodeKey != null) {
    return `key:${String(vnodeKey)}`;
  }
  return null;
}
