import type { GeoViewport } from "@/lib/types";

export function normalizeLng(lng: number): number {
  let normalized = lng;
  while (normalized > 180) {
    normalized -= 360;
  }
  while (normalized < -180) {
    normalized += 360;
  }
  return normalized;
}

export function isLngInRange(lng: number, west: number, east: number): boolean {
  if (west <= east) {
    return lng >= west && lng <= east;
  }
  return lng >= west || lng <= east;
}

export function isPointInViewport(lat: number, lng: number, viewport: GeoViewport): boolean {
  if (lat > viewport.north || lat < viewport.south) {
    return false;
  }
  return isLngInRange(normalizeLng(lng), viewport.west, viewport.east);
}
