export function resolveGraphicIdentity(
  propsId: string | number | undefined,
  vnodeKey: unknown,
  uid: number,
): { id: string; orderKey?: string; missingIdentity: boolean } {
  if (propsId != null) {
    const id = String(propsId);
    return { id, orderKey: `id:${id}`, missingIdentity: false };
  }
  if (vnodeKey != null) {
    const id = String(vnodeKey);
    return { id, orderKey: `key:${id}`, missingIdentity: false };
  }
  return { id: `__ve_graphic_${uid}`, missingIdentity: true };
}

export function resolveGraphicOrderKey(propsId: unknown, vnodeKey: unknown): string | null {
  if (propsId != null) {
    return `id:${String(propsId)}`;
  }
  if (vnodeKey != null) {
    return `key:${String(vnodeKey)}`;
  }
  return null;
}
