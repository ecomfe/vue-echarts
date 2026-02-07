import type { GraphicOverlayUI } from "./types";

const LIGHT_TOKENS: GraphicOverlayUI = {
  cardBg: "rgba(255,255,255,.93)",
  cardStroke: "rgba(148,163,184,.45)",
  cardTitle: "#0f172a",
  cardLabel: "#64748b",
  cardValue: "#1e293b",
  cardFocus: "#0f766e",
  bubbleBg: "rgba(255,255,255,.96)",
  bubbleStroke: "rgba(148,163,184,.56)",
  bubbleText: "#334155",
  bubbleTextFocus: "#0f172a",
  focusLine: "#0f172a",
  dotStroke: "#ffffff",
};

const DARK_TOKENS: GraphicOverlayUI = {
  cardBg: "rgba(5,12,27,.92)",
  cardStroke: "rgba(71,85,105,.56)",
  cardTitle: "#e2e8f0",
  cardLabel: "#94a3b8",
  cardValue: "#e2e8f0",
  cardFocus: "#99f6e4",
  bubbleBg: "rgba(7,16,34,.92)",
  bubbleStroke: "rgba(71,85,105,.64)",
  bubbleText: "#cbd5e1",
  bubbleTextFocus: "#f8fafc",
  focusLine: "#e2e8f0",
  dotStroke: "#0b1220",
};

export function resolveGraphicOverlayTokens(isDark: boolean): GraphicOverlayUI {
  return isDark ? DARK_TOKENS : LIGHT_TOKENS;
}
