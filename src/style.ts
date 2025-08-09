import cssRules from "./style.css?raw";

if (typeof document !== "undefined") {
  if (
    Array.isArray(document.adoptedStyleSheets) &&
    "replaceSync" in CSSStyleSheet.prototype
  ) {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(cssRules);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  } else {
    const styleEl = document.createElement("style");
    styleEl.textContent = cssRules;
    document.head.appendChild(styleEl);
  }
}
