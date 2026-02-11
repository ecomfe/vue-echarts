import type { GraphicOverlayUI } from "./types";

const LIGHT_TOKENS: GraphicOverlayUI = {
  bubbleBg: "rgba(255,255,255,.94)",
  bubbleStroke: "rgba(148,163,184,.48)",
  bubbleText: "#334155",
  bubbleTextFocus: "#0f172a",
  focusLine: "rgba(15,23,42,.62)",
  lineSoft: "rgba(100,116,139,.52)",
  dotStroke: "#ffffff",
};

const DARK_TOKENS: GraphicOverlayUI = {
  bubbleBg: "rgba(15,23,42,.92)",
  bubbleStroke: "rgba(71,85,105,.6)",
  bubbleText: "#cbd5e1",
  bubbleTextFocus: "#f8fafc",
  focusLine: "rgba(226,232,240,.76)",
  lineSoft: "rgba(148,163,184,.52)",
  dotStroke: "#0b1220",
};

export function resolveGraphicOverlayTokens(isDark: boolean): GraphicOverlayUI {
  return isDark ? DARK_TOKENS : LIGHT_TOKENS;
}
