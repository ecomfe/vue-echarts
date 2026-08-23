import cssRules from "./style.css?raw";
import { isBrowser } from "./utils";

const STYLE_REGISTRY = Symbol.for("vue-echarts.styles");

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
  ) as (Document | ShadowRoot) & Record<symbol, Set<string> | undefined>;
  const styles = (target[STYLE_REGISTRY] ??= new Set());

  if (styles.has(cssRules)) {
    return;
  }

  const isDocument = target.nodeType === Node.DOCUMENT_NODE;
  const ownerDocument = isDocument ? (target as Document) : target.ownerDocument!;
  const StyleSheet = ownerDocument.defaultView?.CSSStyleSheet;

  if (
    StyleSheet &&
    Array.isArray(target.adoptedStyleSheets) &&
    "replaceSync" in StyleSheet.prototype
  ) {
    const sheet = new StyleSheet();
    sheet.replaceSync(cssRules);
    target.adoptedStyleSheets = [...target.adoptedStyleSheets, sheet];
  } else {
    const styleEl = ownerDocument.createElement("style");
    styleEl.textContent = cssRules;
    (isDocument ? ownerDocument.head : target).appendChild(styleEl);
  }
  styles.add(cssRules);
}
