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
  if (existing && "element" in existing) {
    if (existing.element.parentNode !== container) {
      container.appendChild(existing.element);
    }
    return;
  }

  const sheet = existing?.sheet;
  const adoptedStyleSheets = target.adoptedStyleSheets;
  if (sheet && Array.isArray(adoptedStyleSheets) && adoptedStyleSheets.includes(sheet)) {
    return;
  }
  const StyleSheet = ownerDocument.defaultView?.CSSStyleSheet;

  if (Array.isArray(adoptedStyleSheets)) {
    try {
      const adoptedSheet = sheet ?? new StyleSheet!();
      if (!sheet) {
        adoptedSheet.replaceSync(cssRules);
      }
      target.adoptedStyleSheets = [...adoptedStyleSheets, adoptedSheet];
      styles.set(cssRules, { sheet: adoptedSheet });
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
