import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { register, TAG_NAME } from "../src/wc";

declare global {
  interface HTMLElement {
    __dispose?: (() => void) | null;
  }
}

describe("register", () => {
  describe("with stubbed customElements", () => {
    class CustomElementRegistryStub {
      private readonly registry = new Map<string, CustomElementConstructor>();

      define(name: string, ctor: CustomElementConstructor): void {
        this.registry.set(name, ctor);
      }

      get(name: string): CustomElementConstructor | undefined {
        return this.registry.get(name);
      }
    }

    let registry: CustomElementRegistryStub;

    beforeEach(() => {
      vi.unstubAllGlobals();

      registry = new CustomElementRegistryStub();
      vi.stubGlobal("customElements", registry as unknown as CustomElementRegistry);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it("rejects an incompatible element already registered", () => {
      const existing = class extends HTMLElement {};
      registry.define(TAG_NAME, existing);

      const defineSpy = vi.spyOn(registry, "define");

      expect(register()).toBe(false);
      expect(defineSpy).not.toHaveBeenCalled();
      expect(registry.get(TAG_NAME)).toBe(existing);
    });

    it("reuses its registration across module instances", async () => {
      expect(register()).toBe(true);
      expect(registry.get(TAG_NAME)).toBeTypeOf("function");
      vi.resetModules();

      const defineSpy = vi.spyOn(registry, "define");
      const reloaded = await import("../src/wc");
      expect(reloaded.register()).toBe(true);
      expect(defineSpy).not.toHaveBeenCalled();
    });
  });

  describe("with native customElements", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
      document.body.innerHTML = "";
    });

    afterEach(() => {
      document.body.innerHTML = "";
    });

    it("keeps chart alive across DOM moves and disposes after removal", async () => {
      expect(register()).toBe(true);

      const element = document.createElement(TAG_NAME) as HTMLElement & {
        __dispose: (() => void) | null;
      };
      const dispose = vi.fn();
      element.__dispose = dispose;

      const parent = document.body.appendChild(document.createElement("div"));
      document.body.appendChild(element);
      parent.appendChild(element);

      await Promise.resolve();

      expect(dispose).not.toHaveBeenCalled();
      expect(element.__dispose).toBe(dispose);

      element.remove();

      await Promise.resolve();

      expect(dispose).toHaveBeenCalledTimes(1);
      expect(element.__dispose).toBeNull();
    });
  });
});
