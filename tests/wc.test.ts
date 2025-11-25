import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

declare global {
  interface HTMLElement {
    __dispose?: (() => void) | null;
  }
}

const loadModule = async () => {
  const mod = await import("../src/wc");
  mod.__resetRegisterState();
  return mod;
};

describe("register", () => {
  describe("with stubbed customElements", () => {
    class CustomElementRegistryStub {
      private readonly registry = new Map<string, CustomElementConstructor>();

      define(name: string, ctor: CustomElementConstructor): void {
        if (this.registry.has(name)) {
          throw new DOMException("already defined", "NotSupportedError");
        }
        this.registry.set(name, ctor);
      }

      get(name: string): CustomElementConstructor | undefined {
        return this.registry.get(name);
      }
    }

    let registry: CustomElementRegistryStub;

    beforeEach(() => {
      vi.resetModules();
      vi.unstubAllGlobals();

      registry = new CustomElementRegistryStub();
      vi.stubGlobal(
        "customElements",
        registry as unknown as CustomElementRegistry,
      );
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it("returns false when custom elements are unavailable", async () => {
      vi.unstubAllGlobals();
      vi.stubGlobal(
        "customElements",
        undefined as unknown as CustomElementRegistry,
      );

      const { register } = await loadModule();

      expect(register()).toBe(false);
      expect(register()).toBe(false);
    });

    it("returns false when browser APIs are disabled", async () => {
      vi.resetModules();
      // Simulate missing browser API by providing a registry without `get`
      vi.stubGlobal("customElements", {
        define() {},
      } as unknown as CustomElementRegistry);

      const { register } = await loadModule();
      expect(register()).toBe(false);
      expect(register()).toBe(false);
    });

    it("registers the custom element once", async () => {
      const defineSpy = vi.spyOn(registry, "define");

      const { register, TAG_NAME } = await loadModule();

      expect(register()).toBe(true);
      expect(defineSpy).toHaveBeenCalledTimes(1);
      expect(registry.get(TAG_NAME)).toBeTypeOf("function");

      defineSpy.mockClear();
      expect(register()).toBe(true);
      expect(defineSpy).not.toHaveBeenCalled();
    });

    it("handles definition failures gracefully", async () => {
      const defineSpy = vi.spyOn(registry, "define").mockImplementation(() => {
        throw new Error("boom");
      });

      const { register, TAG_NAME } = await loadModule();

      expect(register()).toBe(false);
      expect(register()).toBe(false)
      expect(defineSpy).toHaveBeenCalledTimes(1);
      expect(registry.get(TAG_NAME)).toBeUndefined();
    });

    it("skips redefinition when element already registered", async () => {
      const existing = class extends HTMLElement {};
      const { register, TAG_NAME } = await loadModule();
      registry.define(TAG_NAME, existing);

      const defineSpy = vi.spyOn(registry, "define");

      expect(register()).toBe(true);
      expect(defineSpy).not.toHaveBeenCalled();
      expect(registry.get(TAG_NAME)).toBe(existing);
    });

    it("exposes a constructor with disconnect hook", async () => {
      const { register, TAG_NAME } = await loadModule();

      expect(register()).toBe(true);

      const ctor = registry.get(TAG_NAME);
      expect(typeof ctor).toBe("function");
      expect("disconnectedCallback" in (ctor?.prototype ?? {})).toBe(true);
    });
  });

  describe("with native customElements", () => {
    let original: CustomElementConstructor | undefined;

    beforeEach(() => {
      vi.resetModules();
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
      original = customElements.get("x-vue-echarts");
      document.body.innerHTML = "";
    });

    afterEach(() => {
      document.body.innerHTML = "";
      if (original) {
        customElements.define("x-vue-echarts", original);
      }
    });

    it("disposes chart when element is removed from DOM", async () => {
      const { register, TAG_NAME } = await loadModule();

      expect(register()).toBe(true);

      const element = document.createElement(TAG_NAME) as HTMLElement & {
        __dispose: (() => void) | null;
      };
      const dispose = vi.fn();
      element.__dispose = dispose;

      document.body.appendChild(element);
      document.body.removeChild(element);

      await Promise.resolve();

      expect(dispose).toHaveBeenCalledTimes(1);
      expect(element.__dispose).toBeNull();
    });
  });
});
