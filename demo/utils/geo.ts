import type { registerMap } from "echarts/core";

type GeoJSONInput = Parameters<typeof registerMap>[1];

type FeatureCollectionLike = { type?: unknown };

export function isGeoJSONSource(value: unknown): value is GeoJSONInput {
  if (typeof value === "string") {
    return true;
  }
  if (value && typeof value === "object" && "type" in value) {
    const type = (value as FeatureCollectionLike).type;
    return type === "FeatureCollection";
  }
  return false;
}
