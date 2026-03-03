export type LatLngTuple = [number, number];

export type LeafletBounds = {
  getNorth: () => number;
  getSouth: () => number;
  getEast: () => number;
  getWest: () => number;
};

export type LeafletMap = {
  setView: (center: LatLngTuple, zoom: number) => LeafletMap;
  on: (eventName: "moveend" | "zoomend", handler: () => void) => LeafletMap;
  getZoom: () => number;
  getBounds: () => LeafletBounds;
  remove: () => void;
};

export type LeafletLayer = {
  addTo: (map: LeafletMap) => LeafletLayer;
  remove: () => void;
  on: (eventName: "click", handler: () => void) => LeafletLayer;
};

export type LeafletGlobal = {
  map: (element: HTMLElement, options?: { zoomControl?: boolean }) => LeafletMap;
  tileLayer: (
    template: string,
    options: {
      attribution: string;
      maxZoom?: number;
    }
  ) => LeafletLayer;
  circleMarker: (
    point: LatLngTuple,
    options: {
      radius: number;
      color: string;
      fillColor: string;
      fillOpacity: number;
      weight: number;
    }
  ) => LeafletLayer;
};

declare global {
  interface Window {
    L?: LeafletGlobal;
  }
}

let leafletLoadingPromise: Promise<void> | null = null;

function ensureLeafletCss(): void {
  if (document.getElementById("leaflet-css")) {
    return;
  }

  const link = document.createElement("link");
  link.id = "leaflet-css";
  link.rel = "stylesheet";
  link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  document.head.appendChild(link);
}

export async function loadLeaflet(): Promise<LeafletGlobal | null> {
  if (typeof window === "undefined") {
    return null;
  }

  if (window.L) {
    return window.L;
  }

  if (!leafletLoadingPromise) {
    ensureLeafletCss();
    leafletLoadingPromise = new Promise<void>((resolve, reject) => {
      const existing = document.getElementById("leaflet-sdk") as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("Leaflet script load failed")), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.id = "leaflet-sdk";
      script.async = true;
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Leaflet script load failed"));
      document.head.appendChild(script);
    });
  }

  await leafletLoadingPromise;
  return window.L ?? null;
}
