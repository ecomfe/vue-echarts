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

    function installDuringDefinition(ctor: CustomElementConstructor): void {
      const define = registry.define.bind(registry);
      vi.spyOn(registry, "define").mockImplementation((name) => {
        define(name, ctor);
        throw new DOMException("already defined", "NotSupportedError");
      });
    }

    function getDisconnectedCallback(tagName: string): (this: HTMLElement) => void {
      const ctor = registry.get(tagName);
      if (!ctor) {
        throw new Error("Expected custom element constructor to be registered.");
      }
      return (ctor.prototype as { disconnectedCallback: (this: HTMLElement) => void })
        .disconnectedCallback;
    }

    beforeEach(() => {
      vi.unstubAllGlobals();

      registry = new CustomElementRegistryStub();
      vi.stubGlobal("customElements", registry as unknown as CustomElementRegistry);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it("retries when custom elements become available", () => {
      vi.unstubAllGlobals();
      vi.stubGlobal("customElements", undefined as unknown as CustomElementRegistry);

      expect(register()).toBe(false);

      vi.stubGlobal("customElements", registry as unknown as CustomElementRegistry);

      expect(register()).toBe(true);
      expect(registry.get(TAG_NAME)).toBeTypeOf("function");
    });

    it("returns false when browser APIs are disabled", () => {
      // Simulate missing browser API by providing a registry without `get`
      vi.stubGlobal("customElements", {
        define() {},
      } as unknown as CustomElementRegistry);

      expect(register()).toBe(false);
      expect(register()).toBe(false);
    });

    it("registers the custom element once", () => {
      const defineSpy = vi.spyOn(registry, "define");

      expect(register()).toBe(true);
      expect(defineSpy).toHaveBeenCalledTimes(1);
      expect(registry.get(TAG_NAME)).toBeTypeOf("function");

      defineSpy.mockClear();
      expect(register()).toBe(true);
      expect(defineSpy).not.toHaveBeenCalled();
    });

    it("retries after a definition failure", () => {
      const defineSpy = vi.spyOn(registry, "define").mockImplementationOnce(() => {
        throw new Error("boom");
      });

      expect(register()).toBe(false);
      expect(register()).toBe(true);
      expect(defineSpy).toHaveBeenCalledTimes(2);
      expect(registry.get(TAG_NAME)).toBeTypeOf("function");
    });

    it("rejects an incompatible element registered during definition", () => {
      const competing = class extends HTMLElement {};
      installDuringDefinition(competing);

      expect(register()).toBe(false);
      expect(registry.get(TAG_NAME)).toBe(competing);
    });

    it("accepts a compatible element registered during definition", () => {
      const competing = class extends HTMLElement {};
      Object.defineProperty(competing, Symbol.for("vue-echarts.lifecycle"), { value: true });
      installDuringDefinition(competing);

      expect(register()).toBe(true);
      expect(registry.get(TAG_NAME)).toBe(competing);
    });

    it("rejects an incompatible element already registered", () => {
      const existing = class extends HTMLElement {};
      registry.define(TAG_NAME, existing);

      const defineSpy = vi.spyOn(registry, "define");

      expect(register()).toBe(false);
      expect(defineSpy).not.toHaveBeenCalled();
      expect(registry.get(TAG_NAME)).toBe(existing);
    });

    it("recognizes its lifecycle implementation from another module instance", async () => {
      expect(register()).toBe(true);
      vi.resetModules();

      const defineSpy = vi.spyOn(registry, "define");
      const reloaded = await import("../src/wc");
      expect(reloaded.register()).toBe(true);
      expect(defineSpy).not.toHaveBeenCalled();
    });

    it("exposes a constructor that skips disconnect work without a disposal hook", () => {
      expect(register()).toBe(true);

      const disconnectedCallback = getDisconnectedCallback(TAG_NAME);
      expect(disconnectedCallback).toBeTypeOf("function");
      const queueSpy = vi.spyOn(globalThis, "queueMicrotask");

      disconnectedCallback.call({ __dispose: null } as unknown as HTMLElement);

      expect(queueSpy).not.toHaveBeenCalled();
    });

    it("releases the disposal hook when cleanup fails", () => {
      expect(register()).toBe(true);

      const disconnectedCallback = getDisconnectedCallback(TAG_NAME);
      let task: VoidFunction | undefined;
      vi.spyOn(globalThis, "queueMicrotask").mockImplementation((callback) => {
        task = callback;
      });
      const error = new Error("cleanup failed");
      const element = {
        isConnected: false,
        __dispose: () => {
          throw error;
        },
      } as unknown as HTMLElement;

      disconnectedCallback.call(element);

      expect(() => task?.()).toThrow(error);
      expect(element.__dispose).toBeNull();
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

    it("registers the disposal hook in each document", async () => {
      expect(register()).toBe(true);

      const iframe = document.body.appendChild(document.createElement("iframe"));
      const frameDocument = iframe.contentDocument!;
      const element = frameDocument.body.appendChild(frameDocument.createElement(TAG_NAME));

      try {
        expect(register(element)).toBe(true);
        expect(element.__dispose).toBeNull();

        const dispose = vi.fn();
        element.__dispose = dispose;
        element.remove();
        await Promise.resolve();

        expect(dispose).toHaveBeenCalledTimes(1);
        expect(element.__dispose).toBeNull();
      } finally {
        iframe.remove();
      }
    });

    it("does not borrow the global registry for a document without a window", () => {
      const ownerDocument = document.implementation.createHTMLDocument();
      const getSpy = vi.spyOn(customElements, "get");

      expect(ownerDocument.defaultView).toBeNull();
      expect(register(ownerDocument.body)).toBe(false);
      expect(getSpy).not.toHaveBeenCalled();
    });
  });
});
