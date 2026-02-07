import type { EventMarker, GraphicOverlayLayout, OverlayViewport } from "./types";

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const DEFAULT_VIEWPORT: OverlayViewport = {
  width: 980,
  height: 360,
};

const GRID_PERCENT = {
  left: 9,
  right: 6,
  top: 30,
  bottom: 14,
};

const PANEL = {
  margin: 14,
  minWidth: 228,
  maxWidth: 284,
  height: 132,
  paddingX: 16,
  titleOffsetY: 24,
  firstRowOffsetY: 52,
  rowGap: 20,
};

const BUBBLE = {
  height: 30,
  minWidth: 126,
  maxWidth: 210,
  padX: 14,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function intersects(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y + a.height > b.y && a.y < b.y + b.height;
}

function expandRect(rect: Rect, gap: number): Rect {
  return {
    x: rect.x - gap,
    y: rect.y - gap,
    width: rect.width + gap * 2,
    height: rect.height + gap * 2,
  };
}

function bubbleWidth(label: string, viewportWidth: number): number {
  const dynamicMax = Math.max(
    BUBBLE.minWidth,
    Math.min(BUBBLE.maxWidth, Math.round(viewportWidth * 0.24)),
  );
  return clamp(Math.round(label.length * 6.7 + BUBBLE.padX * 2), BUBBLE.minWidth, dynamicMax);
}

export function buildGraphicOverlayLayout(options: {
  days: readonly string[];
  values: number[];
  markers: EventMarker[];
  focusedMarkerId: string;
  yMax: number;
  viewport: OverlayViewport;
}): GraphicOverlayLayout {
  const days = options.days;
  const values = options.values;
  const markers = options.markers;
  const focusedMarkerId = options.focusedMarkerId;

  const viewportWidth = Math.max(options.viewport.width, DEFAULT_VIEWPORT.width * 0.55);
  const viewportHeight = Math.max(options.viewport.height, DEFAULT_VIEWPORT.height * 0.58);

  const panelWidth = clamp(Math.round(viewportWidth * 0.25), PANEL.minWidth, PANEL.maxWidth);
  const summary = {
    x: viewportWidth - panelWidth - PANEL.margin,
    y: PANEL.margin,
    width: panelWidth,
    height: PANEL.height,
    paddingX: PANEL.paddingX,
    titleY: PANEL.margin + PANEL.titleOffsetY,
    firstRowY: PANEL.margin + PANEL.firstRowOffsetY,
    rowGap: PANEL.rowGap,
  };

  const plotLeft = (viewportWidth * GRID_PERCENT.left) / 100;
  const plotRight = viewportWidth - (viewportWidth * GRID_PERCENT.right) / 100;
  const plotTop = (viewportHeight * GRID_PERCENT.top) / 100;
  const plotBottom = viewportHeight - (viewportHeight * GRID_PERCENT.bottom) / 100;
  const plotWidth = plotRight - plotLeft;
  const plotHeight = plotBottom - plotTop;
  const maxBubbleY = plotBottom - BUBBLE.height - 6;

  const placedRects: Rect[] = [];
  const reservedRects: Rect[] = [expandRect({ ...summary }, 8)];
  const laneBySide = { left: 0, right: 0 };

  const overlayMarkers = markers.map((marker) => {
    const day = days[marker.dayIndex];
    const value = values[marker.dayIndex];
    const focused = marker.id === focusedMarkerId;
    const label = `${marker.title} · ${day}`;

    const x = Math.round(plotLeft + (plotWidth * marker.dayIndex) / (days.length - 1));
    const y = Math.round(plotTop + plotHeight * (1 - value / options.yMax));

    const bubbleWidthPx = bubbleWidth(label, plotWidth);
    const side = x > summary.x - 22 ? "left" : "right";
    const lane = side === "left" ? laneBySide.left++ : laneBySide.right++;
    const laneOffset = lane * 28;

    const preferredLeftX = x - bubbleWidthPx - 16;
    const preferredRightX = x + 16;
    const preferredAboveY = y - 42 - laneOffset;
    const preferredBelowY = y + 10 + laneOffset;

    const rawCandidates =
      side === "left"
        ? [
            { x: preferredLeftX, y: preferredAboveY },
            { x: preferredLeftX, y: preferredBelowY },
            { x: preferredRightX, y: preferredAboveY },
            { x: preferredRightX, y: preferredBelowY },
          ]
        : [
            { x: preferredRightX, y: preferredAboveY },
            { x: preferredRightX, y: preferredBelowY },
            { x: preferredLeftX, y: preferredAboveY },
            { x: preferredLeftX, y: preferredBelowY },
          ];

    const candidates = rawCandidates.map((candidate) => {
      const bubbleX = clamp(candidate.x, 8, Math.max(8, viewportWidth - bubbleWidthPx - 8));
      const bubbleY = clamp(candidate.y, 8, maxBubbleY);
      return {
        bubbleX,
        bubbleY,
        rect: { x: bubbleX, y: bubbleY, width: bubbleWidthPx, height: BUBBLE.height } as Rect,
      };
    });

    const picked =
      candidates.find(
        ({ rect }) =>
          !reservedRects.some((reserved) => intersects(rect, reserved)) &&
          !placedRects.some((placed) => intersects(rect, placed)),
      ) ?? candidates[0];

    placedRects.push(picked.rect);

    const anchorX =
      picked.bubbleX + bubbleWidthPx / 2 < x ? picked.bubbleX + bubbleWidthPx : picked.bubbleX;
    const anchorY = clamp(y, picked.bubbleY + 4, picked.bubbleY + BUBBLE.height - 4);

    return {
      ...marker,
      day,
      value,
      focused,
      label,
      x,
      y,
      bubbleX: picked.bubbleX,
      bubbleY: picked.bubbleY,
      bubbleWidth: bubbleWidthPx,
      bubbleHeight: BUBBLE.height,
      textX: picked.bubbleX + bubbleWidthPx / 2,
      textY: picked.bubbleY + BUBBLE.height / 2,
      anchorX,
      anchorY,
    };
  });

  return {
    summary,
    markers: overlayMarkers,
  };
}
