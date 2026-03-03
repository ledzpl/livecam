import { CITY_CATALOG } from "@/lib/city-catalog";
import { isPointInViewport, normalizeLng } from "@/lib/geo";
import type { SearchSeed } from "@/lib/live-search-seeds";
import type { GeoViewport } from "@/lib/types";

const QUERY_SUFFIXES = [
  "live webcam",
  "live cam",
  "street live",
  "city center live",
  "walk live"
];

function toNumber(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function lngSpanDegrees(west: number, east: number): number {
  if (west <= east) {
    return east - west;
  }
  return 360 - (west - east);
}

function viewportCenter(viewport: GeoViewport): { lat: number; lng: number } {
  const lat = (viewport.north + viewport.south) / 2;
  const span = lngSpanDegrees(viewport.west, viewport.east);
  const lng = normalizeLng(viewport.west + span / 2);
  return { lat, lng };
}

function cityDistanceScore(lat: number, lng: number, cityLat: number, cityLng: number): number {
  const latDiff = Math.abs(cityLat - lat);
  const lngDiff = Math.abs(normalizeLng(cityLng - lng));
  return latDiff * latDiff + lngDiff * lngDiff;
}

function maxSeedCountByZoom(zoom: number): number {
  if (zoom >= 12) {
    return 5;
  }
  if (zoom >= 10) {
    return 5;
  }
  if (zoom >= 8) {
    return 6;
  }
  if (zoom >= 6) {
    return 7;
  }
  return 8;
}

function buildCitySeeds(cityNames: Array<{ key: string; name: string }>, limit: number): SearchSeed[] {
  const seeds: SearchSeed[] = [];
  for (const suffix of QUERY_SUFFIXES) {
    for (const city of cityNames) {
      if (seeds.length >= limit) {
        return seeds;
      }
      seeds.push({
        cityKey: city.key,
        query: `${city.name} ${suffix}`
      });
    }
  }
  return seeds;
}

export function parseViewportFromRequest(request: Request): GeoViewport | null {
  const searchParams = new URL(request.url).searchParams;
  const north = toNumber(searchParams.get("north"));
  const south = toNumber(searchParams.get("south"));
  const east = toNumber(searchParams.get("east"));
  const west = toNumber(searchParams.get("west"));
  const zoom = toNumber(searchParams.get("zoom"));

  if (north === null || south === null || east === null || west === null || zoom === null) {
    return null;
  }

  if (north < -90 || north > 90 || south < -90 || south > 90 || south > north) {
    return null;
  }

  return {
    north,
    south,
    east: normalizeLng(east),
    west: normalizeLng(west),
    zoom
  };
}

export function buildSeedsForViewport(viewport: GeoViewport): SearchSeed[] {
  const center = viewportCenter(viewport);
  const maxSeeds = maxSeedCountByZoom(viewport.zoom);

  const visibleCities = CITY_CATALOG.filter((city) => isPointInViewport(city.lat, city.lng, viewport))
    .map((city) => ({
      city,
      score: cityDistanceScore(center.lat, center.lng, city.lat, city.lng)
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, maxSeeds)
    .map((entry) => entry.city);

  if (visibleCities.length > 0) {
    return buildCitySeeds(
      visibleCities.map((city) => ({ key: city.key, name: city.name })),
      maxSeeds
    );
  }

  const nearbyCities = CITY_CATALOG.map((city) => ({
    city,
    score: cityDistanceScore(center.lat, center.lng, city.lat, city.lng)
  }))
    .sort((a, b) => a.score - b.score)
    .slice(0, Math.max(2, Math.ceil(maxSeeds / 2)))
    .map((entry) => ({ key: entry.city.key, name: entry.city.name }));

  return buildCitySeeds(nearbyCities, maxSeeds);
}
