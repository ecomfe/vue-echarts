import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const STYLE_REGISTRY = Symbol.for("vue-echarts.styles");

describe("style entry", () => {
  const adoptedDescriptor = Object.getOwnPropertyDescriptor(
    Document.prototype,
    "adoptedStyleSheets",
  );

  beforeEach(() => {
    vi.resetModules();
    document.head.innerHTML = "";
    Reflect.deleteProperty(document, STYLE_REGISTRY);
  });

  afterEach(() => {
    Reflect.deleteProperty(document, STYLE_REGISTRY);
    if (adoptedDescriptor) {
      Object.defineProperty(document, "adoptedStyleSheets", adoptedDescriptor);
    } else {
      const doc = document as unknown as Record<string, unknown> & {
        adoptedStyleSheets?: CSSStyleSheet[];
      };
      delete doc.adoptedStyleSheets;
    }
  });

  it("injects one fallback style tag across repeated module loads", async () => {
    Object.defineProperty(document, "adoptedStyleSheets", {
      configurable: true,
      value: undefined,
    });

    const replaceSpy = vi.spyOn(CSSStyleSheet.prototype, "replaceSync");

    await import("../src/style");

    const styleEl = document.head.querySelector("style");

    expect(replaceSpy).not.toHaveBeenCalled();
    expect(styleEl).not.toBeNull();
    if (!styleEl) {
      throw new Error("Expected fallback style tag to be injected.");
    }
    expect(styleEl.textContent).not.toBe("");

    const duplicateEntry = new URL("../src/style?duplicate", import.meta.url).href;
    await import(/* @vite-ignore */ duplicateEntry);

    expect(document.head.querySelectorAll("style")).toHaveLength(1);
  });
});
