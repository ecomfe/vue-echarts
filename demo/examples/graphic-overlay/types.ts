export type EventMarker = {
  id: string;
  dayIndex: number;
  title: string;
  color: string;
};

export type OverlayMarker = EventMarker & {
  day: string;
  value: number;
  focused: boolean;
  label: string;
  x: number;
  y: number;
  bubbleX: number;
  bubbleY: number;
  bubbleWidth: number;
  bubbleHeight: number;
  textX: number;
  textY: number;
  anchorX: number;
  anchorY: number;
};

export type SummaryData = {
  peak: string;
  low: string;
  delta: string;
  focus: string;
};

export type GraphicOverlayUI = {
  cardBg: string;
  cardStroke: string;
  cardTitle: string;
  cardLabel: string;
  cardValue: string;
  cardFocus: string;
  bubbleBg: string;
  bubbleStroke: string;
  bubbleText: string;
  bubbleTextFocus: string;
  focusLine: string;
  dotStroke: string;
};

export type OverlayViewport = {
  width: number;
  height: number;
};

export type SummaryPanelLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
  paddingX: number;
  titleY: number;
  firstRowY: number;
  rowGap: number;
};

export type GraphicOverlayLayout = {
  summary: SummaryPanelLayout;
  markers: OverlayMarker[];
};
