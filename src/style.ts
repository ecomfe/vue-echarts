import cssRules from "./style.css?raw";
import { isBrowser } from "./utils";

const STYLE_REGISTRY = Symbol.for("vue-echarts.styles");

export function ensureStyles(root?: Document | ShadowRoot): void {
  if (!isBrowser()) {
    return;
  }

  const target = (root ?? document) as (Document | ShadowRoot) &
    Record<symbol, Set<string> | undefined>;
  const styles = (target[STYLE_REGISTRY] ??= new Set());

  if (styles.has(cssRules)) {
    return;
  }

  if (Array.isArray(target.adoptedStyleSheets) && "replaceSync" in CSSStyleSheet.prototype) {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(cssRules);
    target.adoptedStyleSheets = [...target.adoptedStyleSheets, sheet];
  } else {
    const ownerDocument = target instanceof Document ? target : target.ownerDocument;
    const styleEl = ownerDocument.createElement("style");
    styleEl.textContent = cssRules;
    (target instanceof Document ? target.head : target).appendChild(styleEl);
  }
  styles.add(cssRules);
}
