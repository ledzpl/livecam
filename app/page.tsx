"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import LiveSidebar from "@/app/components/LiveSidebar";
import LiveMap from "@/app/components/LiveMap";
import VideoModal from "@/app/components/VideoModal";
import { isPointInViewport } from "@/lib/geo";
import type { GeoViewport, LiveStream } from "@/lib/types";

type LiveStreamsApiResponse = {
  streams?: LiveStream[];
  message?: string;
  lastUpdatedAt?: string;
};

export default function Home() {
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState<string | undefined>();
  const [modalStream, setModalStream] = useState<LiveStream | null>(null);
  const [viewport, setViewport] = useState<GeoViewport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const requestSeqRef = useRef(0);
  const activeControllerRef = useRef<AbortController | null>(null);

  const visibleStreams = useMemo(() => {
    if (!viewport) {
      return streams;
    }

    return streams.filter((stream) => isPointInViewport(stream.location.lat, stream.location.lng, viewport));
  }, [streams, viewport]);

  const selectedStream = useMemo(
    () => visibleStreams.find((stream) => stream.videoId === selectedVideoId) ?? null,
    [visibleStreams, selectedVideoId]
  );

  const loadStreams = useCallback(async (nextViewport?: GeoViewport | null) => {
    const requestSeq = requestSeqRef.current + 1;
    requestSeqRef.current = requestSeq;

    activeControllerRef.current?.abort();
    const controller = new AbortController();
    activeControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (nextViewport) {
        params.set("north", String(nextViewport.north));
        params.set("south", String(nextViewport.south));
        params.set("east", String(nextViewport.east));
        params.set("west", String(nextViewport.west));
        params.set("zoom", String(nextViewport.zoom));
      }

      const url = params.size > 0 ? `/api/live-streams?${params.toString()}` : "/api/live-streams";
      const response = await fetch(url, { cache: "no-store", signal: controller.signal });
      const payload = (await response.json()) as LiveStreamsApiResponse;

      if (requestSeqRef.current !== requestSeq) {
        return;
      }

      if (!response.ok) {
        throw new Error(payload.message ?? "라이브 목록을 불러오지 못했습니다.");
      }

      const nextStreams = payload.streams ?? [];
      const scopedNextStreams =
        nextViewport && nextStreams.length > 0
          ? nextStreams.filter((stream) => isPointInViewport(stream.location.lat, stream.location.lng, nextViewport))
          : nextStreams;

      setStreams(scopedNextStreams);
      setLastUpdatedAt(payload.lastUpdatedAt ?? null);
      setSelectedVideoId((prev) => {
        if (scopedNextStreams.length === 0) {
          return undefined;
        }
        if (prev && scopedNextStreams.some((stream) => stream.videoId === prev)) {
          return prev;
        }
        return scopedNextStreams[0].videoId;
      });

      if (payload.message) {
        setError(payload.message);
      }
    } catch (requestError) {
      if (controller.signal.aborted) {
        return;
      }

      if (requestSeqRef.current !== requestSeq) {
        return;
      }

      setError(requestError instanceof Error ? requestError.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      if (requestSeqRef.current === requestSeq) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!viewport) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      loadStreams(viewport);
    }, 400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [viewport, loadStreams]);

  useEffect(() => {
    return () => {
      activeControllerRef.current?.abort();
    };
  }, []);

  const handleSelectStream = useCallback((stream: LiveStream) => {
    setSelectedVideoId(stream.videoId);
    setModalStream(stream);
  }, []);

  const handleViewportChange = useCallback((nextViewport: GeoViewport) => {
    setViewport((current) => {
      if (
        current &&
        current.north === nextViewport.north &&
        current.south === nextViewport.south &&
        current.east === nextViewport.east &&
        current.west === nextViewport.west &&
        current.zoom === nextViewport.zoom
      ) {
        return current;
      }
      return nextViewport;
    });
  }, []);

  return (
    <main className="app-shell">
      <LiveSidebar
        loading={loading}
        error={error}
        lastUpdatedAt={lastUpdatedAt}
        streams={visibleStreams}
        selectedVideoId={selectedVideoId}
        onSelect={handleSelectStream}
        onRefresh={() => loadStreams(viewport)}
      />

      <section className="map-panel">
        <LiveMap
          streams={visibleStreams}
          selectedVideoId={selectedVideoId}
          onSelect={handleSelectStream}
          onViewportChange={handleViewportChange}
        />

        <div className="map-caption">
          <p>마커를 클릭하면 해당 라이브 방송이 팝업으로 재생됩니다.</p>
          {selectedStream ? (
            <p>
              선택됨: {selectedStream.location.name} · {selectedStream.channelTitle}
            </p>
          ) : null}
        </div>
      </section>

      <VideoModal stream={modalStream} onClose={() => setModalStream(null)} />
    </main>
  );
}
