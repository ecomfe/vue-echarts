import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("style entry", () => {
  const adoptedDescriptor = Object.getOwnPropertyDescriptor(
    Document.prototype,
    "adoptedStyleSheets",
  );

  beforeEach(() => {
    vi.resetModules();
    document.head.innerHTML = "";
  });

  afterEach(() => {
    if (adoptedDescriptor) {
      Object.defineProperty(document, "adoptedStyleSheets", adoptedDescriptor);
    } else {
      const doc = document as unknown as Record<string, unknown> & {
        adoptedStyleSheets?: CSSStyleSheet[];
      };
      delete doc.adoptedStyleSheets;
    }
  });

  it("falls back to style tag when adoptedStyleSheets is unavailable", async () => {
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
  });
});
