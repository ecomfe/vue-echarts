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
  cpx1: number;
  cpy1: number;
  cpx2: number;
  cpy2: number;
};

export type GraphicOverlayUI = {
  bubbleBg: string;
  bubbleStroke: string;
  bubbleText: string;
  bubbleTextFocus: string;
  focusLine: string;
  lineSoft: string;
  dotStroke: string;
};

export type OverlayViewport = {
  width: number;
  height: number;
};

export type OverlayPlotLayout = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
};

export type GraphicOverlayLayout = {
  plot: OverlayPlotLayout;
  markers: OverlayMarker[];
};
