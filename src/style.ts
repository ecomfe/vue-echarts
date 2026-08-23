import cssRules from "./style.css?raw";
import { isBrowser } from "./utils";

const STYLE_REGISTRY = Symbol.for("vue-echarts.styles");

if (isBrowser()) {
  const styledDocument = document as Document & Record<symbol, Set<string> | undefined>;
  const styles = (styledDocument[STYLE_REGISTRY] ??= new Set());

  if (!styles.has(cssRules)) {
    if (Array.isArray(document.adoptedStyleSheets) && "replaceSync" in CSSStyleSheet.prototype) {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(cssRules);
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    } else {
      const styleEl = document.createElement("style");
      styleEl.textContent = cssRules;
      document.head.appendChild(styleEl);
    }
    styles.add(cssRules);
  }
}
