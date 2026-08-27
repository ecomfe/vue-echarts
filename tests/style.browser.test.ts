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

function createShadowHost() {
  const host = document.body.appendChild(document.createElement("div"));
  const root = host.attachShadow({ mode: "open" });
  useFallbackStyles(root);
  return { host, root };
}

function createFrame(): { iframe: HTMLIFrameElement; ownerDocument: Document } {
  const iframe = document.createElement("iframe");
  document.body.appendChild(iframe);
  const ownerDocument = iframe.contentDocument;
  if (!ownerDocument) {
    throw new Error("Expected iframe document to be available.");
  }
  return { iframe, ownerDocument };
}

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

  it("injects and restores one fallback style tag across repeated module loads", async () => {
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

    styleEl.remove();
    ensureDuplicateStyles();
    expect(document.head.querySelector("style")).toBe(styleEl);
  });

  it("falls back when constructed stylesheet initialization fails", async () => {
    document.adoptedStyleSheets = [];
    const replaceSpy = vi.spyOn(CSSStyleSheet.prototype, "replaceSync").mockImplementation(() => {
      throw new Error("replaceSync failed");
    });
    const { ensureStyles } = await import("../src/style");

    try {
      expect(() => ensureStyles()).not.toThrow();
      expect(document.adoptedStyleSheets).toEqual([]);
      expect(document.head.querySelector("style")).not.toBeNull();
    } finally {
      replaceSpy.mockRestore();
    }
  });

  it("injects styles when the component is first rendered", async () => {
    useFallbackStyles();

    const { default: ECharts } = await import("../src/ECharts");

    expect(document.head.querySelector("style")).toBeNull();

    render(ECharts);

    expect(document.head.querySelector("style")).not.toBeNull();
  });

  it("contains root spacing, shrinks in columns, and passes rounding to renderers", async () => {
    useFallbackStyles();
    const { ensureStyles } = await import("../src/style");
    ensureStyles();

    const container = document.body.appendChild(document.createElement("div"));
    container.style.cssText = "display:flex;flex-direction:column;width:100px;height:100px";
    const header = container.appendChild(document.createElement("div"));
    header.style.cssText = "height:40px;flex:none";
    const root = container.appendChild(document.createElement("x-vue-echarts"));
    root.style.cssText = "padding:10px;border:2px solid transparent;border-radius:12px";
    const chartHost = root.appendChild(document.createElement("div"));
    chartHost.className = "echarts-host";
    const renderer = chartHost.appendChild(document.createElement("div"));
    renderer.style.height = "100px";
    const canvas = renderer.appendChild(document.createElement("canvas"));
    const svg = renderer.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "svg"));

    expect(root.getBoundingClientRect().height).toBe(60);
    expect(root.getBoundingClientRect().width).toBe(100);
    expect(getComputedStyle(chartHost).borderRadius).toBe("12px");
    expect(getComputedStyle(renderer).borderRadius).toBe("12px");
    expect(getComputedStyle(canvas).borderRadius).toBe("12px");
    expect(getComputedStyle(svg).borderRadius).toBe("12px");
  });

  it("injects styles into the component's shadow root", async () => {
    const { host, root } = createShadowHost();
    const container = root.appendChild(document.createElement("div"));

    const { default: ECharts } = await import("../src/ECharts");
    const app = createApp(ECharts);

    try {
      app.mount(container);
      expect(root.querySelector("style")).not.toBeNull();
    } finally {
      app.unmount();
      host.remove();
    }
  });

  it("injects styles after the component moves between shadow roots", async () => {
    const first = createShadowHost();
    const second = createShadowHost();
    const container = first.root.appendChild(document.createElement("div"));

    const { default: ECharts } = await import("../src/ECharts");
    const app = createApp(ECharts);

    try {
      app.mount(container);
      const element = first.root.querySelector("x-vue-echarts");
      if (!element) {
        throw new Error("Expected chart root to be available.");
      }

      expect(first.root.querySelector("style")).not.toBeNull();
      expect(second.root.querySelector("style")).toBeNull();

      second.root.appendChild(element);
      await Promise.resolve();

      expect(second.root.querySelector("style")).not.toBeNull();
    } finally {
      app.unmount();
      first.host.remove();
      second.host.remove();
    }
  });

  it("uses the component's owner document for registration and styles", async () => {
    const { iframe, ownerDocument } = createFrame();
    useFallbackStyles(ownerDocument);
    const container = ownerDocument.createElement("div");
    ownerDocument.body.appendChild(container);
    const globalRegistryGet = vi.spyOn(customElements, "get");

    const { default: ECharts } = await import("../src/ECharts");
    const app = createApp(ECharts);

    try {
      app.mount(container);
      expect(globalRegistryGet).not.toHaveBeenCalled();
      expect(ownerDocument.head.querySelector("style")).not.toBeNull();
      expect(document.head.querySelector("style")).toBeNull();
      expect(ownerDocument.defaultView?.customElements.get("x-vue-echarts")).toBeTypeOf("function");
    } finally {
      app.unmount();
      globalRegistryGet.mockRestore();
      iframe.remove();
    }
  });

  it("constructs, restores, and falls back from adopted stylesheets in the target document's realm", async () => {
    const { iframe, ownerDocument } = createFrame();
    const StyleSheet = ownerDocument.defaultView?.CSSStyleSheet;
    if (!StyleSheet) {
      throw new Error("Expected iframe CSSStyleSheet constructor to be available.");
    }

    const { ensureStyles } = await import("../src/style");

    try {
      ensureStyles(ownerDocument);

      expect(ownerDocument.adoptedStyleSheets).toHaveLength(1);
      const sheet = ownerDocument.adoptedStyleSheets[0];
      expect(sheet).toBeInstanceOf(StyleSheet);
      expect(document.adoptedStyleSheets).not.toContain(sheet);

      ownerDocument.adoptedStyleSheets = [];
      ensureStyles(ownerDocument);
      expect(ownerDocument.adoptedStyleSheets).toEqual([sheet]);

      Object.defineProperty(ownerDocument, "adoptedStyleSheets", {
        configurable: true,
        get: () => [],
        set: () => {
          throw new Error("adoption failed");
        },
      });

      ensureStyles(ownerDocument);
      ensureStyles(ownerDocument);
      expect(ownerDocument.head.querySelectorAll("style")).toHaveLength(1);
    } finally {
      iframe.remove();
    }
  });
});
