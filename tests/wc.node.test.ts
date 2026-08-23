import { describe, expect, it } from "vitest";

import { __resetRegisterState, register, TAG_NAME } from "../src/wc";

describe("register (node)", () => {
  it("uses an explicit element realm without browser globals", () => {
    const registry = new Map<string, CustomElementConstructor>();
    const realm = {
      customElements: {
        define: (name: string, ctor: CustomElementConstructor) => registry.set(name, ctor),
        get: (name: string) => registry.get(name),
      },
      HTMLElement: class {},
    };
    const root = {
      ownerDocument: { defaultView: realm },
    } as unknown as Element;

    __resetRegisterState();

    expect(register(root)).toBe(true);
    expect(registry.get(TAG_NAME)).toBeTypeOf("function");
  });
});
