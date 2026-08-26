import cssRules from "./style.css?raw";
import { isBrowser } from "./utils";

const STYLE_REGISTRY = Symbol.for("vue-echarts.styles");
type StyleRegistration = { sheet: CSSStyleSheet } | { element: HTMLStyleElement };

export function ensureStyles(root?: Node): void {
  if (!isBrowser()) {
    return;
  }

  const candidate = root ?? document;
  const target = (
    candidate.nodeType === Node.DOCUMENT_NODE ||
    (candidate.nodeType === Node.DOCUMENT_FRAGMENT_NODE && "host" in candidate)
      ? candidate
      : candidate.ownerDocument
  ) as (Document | ShadowRoot) & Record<symbol, Map<string, StyleRegistration> | undefined>;
  const styles = (target[STYLE_REGISTRY] ??= new Map());

  const isDocument = target.nodeType === Node.DOCUMENT_NODE;
  const ownerDocument = isDocument ? (target as Document) : target.ownerDocument!;
  const container = isDocument ? ownerDocument.head : target;
  const existing = styles.get(cssRules);
  if (existing) {
    if ("sheet" in existing) {
      if (!target.adoptedStyleSheets.includes(existing.sheet)) {
        target.adoptedStyleSheets = [...target.adoptedStyleSheets, existing.sheet];
      }
    } else if (existing.element.parentNode !== container) {
      container.appendChild(existing.element);
    }
    return;
  }

  const StyleSheet = ownerDocument.defaultView?.CSSStyleSheet;

  if (
    StyleSheet &&
    Array.isArray(target.adoptedStyleSheets) &&
    "replaceSync" in StyleSheet.prototype
  ) {
    try {
      const sheet = new StyleSheet();
      sheet.replaceSync(cssRules);
      target.adoptedStyleSheets = [...target.adoptedStyleSheets, sheet];
      styles.set(cssRules, { sheet });
      return;
    } catch {
      // Some browsers expose the API but reject construction or adoption at runtime.
    }
  }

  const styleEl = ownerDocument.createElement("style");
  styleEl.textContent = cssRules;
  container.appendChild(styleEl);
  styles.set(cssRules, { element: styleEl });
}
