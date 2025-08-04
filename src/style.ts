import cssRules from "./style.css";

if (typeof document !== "undefined") {
  if (
    "adoptedStyleSheets" in Document.prototype &&
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
