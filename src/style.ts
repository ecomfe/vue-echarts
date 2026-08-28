import cssRules from "./style.css?raw";
import { isBrowser } from "./utils";

if (isBrowser()) {
  if (Array.isArray(document.adoptedStyleSheets) && "replaceSync" in CSSStyleSheet.prototype) {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(cssRules);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  } else {
    const styleEl = document.createElement("style");
    styleEl.textContent = cssRules;
    document.head.appendChild(styleEl);
  }
}
