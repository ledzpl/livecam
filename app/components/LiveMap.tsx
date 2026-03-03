"use client";

import { useEffect, useRef, useState } from "react";

import {
  type LatLngTuple,
  type LeafletLayer,
  type LeafletMap,
  loadLeaflet
} from "@/lib/leaflet-loader";
import type { GeoViewport, LiveStream } from "@/lib/types";

type LiveMapProps = {
  streams: LiveStream[];
  selectedVideoId?: string;
  onSelect: (stream: LiveStream) => void;
  onViewportChange: (viewport: GeoViewport) => void;
};

const ASIA_DEFAULT_CENTER: LatLngTuple = [23, 105];
const ASIA_DEFAULT_ZOOM = 3;

function colorForMarker(active: boolean): { stroke: string; fill: string } {
  if (active) {
    return { stroke: "#1cd3ba", fill: "#9cf2e8" };
  }
  return { stroke: "#ff5a38", fill: "#ff977f" };
}

function roundCoord(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export default function LiveMap({ streams, selectedVideoId, onSelect, onViewportChange }: LiveMapProps) {
  const [loadError, setLoadError] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<LeafletLayer[]>([]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    let cancelled = false;

    loadLeaflet()
      .then((leaflet) => {
        if (cancelled || !containerRef.current || !leaflet) {
          return;
        }

        if (!mapRef.current) {
          const map = leaflet
            .map(containerRef.current, { zoomControl: true })
            .setView(ASIA_DEFAULT_CENTER, ASIA_DEFAULT_ZOOM);
          leaflet
            .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
              attribution: "&copy; OpenStreetMap contributors",
              maxZoom: 19
            })
            .addTo(map);
          mapRef.current = map;

          const reportViewport = () => {
            const bounds = map.getBounds();
            onViewportChange({
              north: roundCoord(bounds.getNorth()),
              south: roundCoord(bounds.getSouth()),
              east: roundCoord(bounds.getEast()),
              west: roundCoord(bounds.getWest()),
              zoom: map.getZoom()
            });
          };

          map.on("moveend", reportViewport);
          map.on("zoomend", reportViewport);
          reportViewport();
        }
      })
      .catch((error) => {
        console.error(error);
        setLoadError(true);
      });

    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [onViewportChange]);

  useEffect(() => {
    if (!mapRef.current || !window.L) {
      return;
    }

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    for (const stream of streams) {
      const point: LatLngTuple = [stream.location.lat, stream.location.lng];

      const color = colorForMarker(stream.videoId === selectedVideoId);
      const marker = window.L
        .circleMarker(point, {
          radius: 8,
          color: color.stroke,
          fillColor: color.fill,
          fillOpacity: 0.92,
          weight: 2
        })
        .addTo(mapRef.current);

      marker.on("click", () => onSelect(stream));
      markersRef.current.push(marker);
    }
  }, [streams, selectedVideoId, onSelect]);

  if (loadError) {
    return (
      <div className="map-fallback">
        <p>지도를 불러오지 못했습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.</p>
      </div>
    );
  }

  return <div ref={containerRef} className="map-canvas" />;
}
