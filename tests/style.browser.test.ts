import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createApp } from "vue";
import { render } from "./helpers/testing";
import { createEChartsModule, resetECharts } from "./helpers/mock";

vi.mock("echarts/core", () => createEChartsModule());

const STYLE_REGISTRY = Symbol.for("vue-echarts.styles");
const useFallbackStyles = (root: Document | ShadowRoot = document) =>
  Object.defineProperty(root, "adoptedStyleSheets", {
    configurable: true,
    value: undefined,
  });

describe("style entry", () => {
  const adoptedDescriptor = Object.getOwnPropertyDescriptor(
    Document.prototype,
    "adoptedStyleSheets",
  );

  beforeEach(() => {
    vi.resetModules();
    resetECharts();
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
    useFallbackStyles();

    const replaceSpy = vi.spyOn(CSSStyleSheet.prototype, "replaceSync");

    const { ensureStyles } = await import("../src/style");

    expect(document.head.querySelector("style")).toBeNull();

    ensureStyles();

    const styleEl = document.head.querySelector("style");

    expect(replaceSpy).not.toHaveBeenCalled();
    expect(styleEl).not.toBeNull();
    if (!styleEl) {
      throw new Error("Expected fallback style tag to be injected.");
    }
    expect(styleEl.textContent).not.toBe("");

    const duplicateEntry = new URL("../src/style?duplicate", import.meta.url).href;
    const { ensureStyles: ensureDuplicateStyles } = await import(/* @vite-ignore */ duplicateEntry);
    ensureDuplicateStyles();

    expect(document.head.querySelectorAll("style")).toHaveLength(1);
  });

  it("injects styles when the component is first rendered", async () => {
    useFallbackStyles();

    const { default: ECharts } = await import("../src/ECharts");

    expect(document.head.querySelector("style")).toBeNull();

    render(ECharts);

    expect(document.head.querySelector("style")).not.toBeNull();
  });

  it("injects styles into the component's shadow root", async () => {
    const host = document.createElement("div");
    const shadowRoot = host.attachShadow({ mode: "open" });
    const container = document.createElement("div");
    useFallbackStyles(shadowRoot);
    shadowRoot.appendChild(container);
    document.body.appendChild(host);

    const { default: ECharts } = await import("../src/ECharts");
    const app = createApp(ECharts);

    try {
      app.mount(container);
      expect(shadowRoot.querySelector("style")).not.toBeNull();
    } finally {
      app.unmount();
      host.remove();
    }
  });
});
