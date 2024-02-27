export const mouseEvents = [
  "click",
  "dblclick",
  "mouseout",
  "mouseover",
  "mouseup",
  "mousedown",
  "mousemove",
  "contextmenu",
  "globalout"
] as const;

export const elementEvents = [
  "mousewheel",
  "drag",
  "dragstart",
  "dragend",
  "dragenter",
  "dragleave",
  "dragover",
  "drop"
] as const;

export const zrenderEvents = [...mouseEvents, ...elementEvents].map(
  e => `zr:${e}`
);

export const otherEvents = [
  "highlight",
  "downplay",
  "selectchanged",
  "legendselectchanged",
  "legendselected",
  "legendunselected",
  "legendselectall",
  "legendinverseselect",
  "legendscroll",
  "datazoom",
  "datarangeselected",
  "graphroam",
  "georoam",
  "treeroam",
  "timelinechanged",
  "timelineplaychanged",
  "restore",
  "dataviewchanged",
  "magictypechanged",
  "geoselectchanged",
  "geoselected",
  "geounselected",
  "axisareaselected",
  "brush",
  "brushEnd",
  "brushselected",
  "globalcursortaken"
] as const;

export const allEvents = [
  ...mouseEvents,
  ...zrenderEvents,
  ...otherEvents,
  "rendered",
  "finished"
];
