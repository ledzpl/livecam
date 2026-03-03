"use client";

import type { LiveStream } from "@/lib/types";

type LiveSidebarProps = {
  loading: boolean;
  error: string | null;
  lastUpdatedAt: string | null;
  streams: LiveStream[];
  selectedVideoId?: string;
  onSelect: (stream: LiveStream) => void;
  onRefresh: () => void;
};

function formatViewers(stream: LiveStream): string {
  return stream.viewerCount ? `${stream.viewerCount.toLocaleString()}명 시청` : "시청자 정보 없음";
}

export default function LiveSidebar({
  loading,
  error,
  lastUpdatedAt,
  streams,
  selectedVideoId,
  onSelect,
  onRefresh
}: LiveSidebarProps) {
  return (
    <aside className="sidebar">
      <header className="sidebar-header">
        <div>
          <p className="eyebrow">LiveCam Viewer</p>
          <h1>유튜브 라이브 지도</h1>
        </div>
        <button type="button" className="refresh-button" onClick={onRefresh}>
          새로고침
        </button>
      </header>

      <section className="status-panel">
        <p>{loading ? "라이브 방송 목록을 불러오는 중..." : `${streams.length}개 라이브 방송`}</p>
        {lastUpdatedAt ? <p>업데이트: {new Date(lastUpdatedAt).toLocaleString()}</p> : null}
        {error ? <p className="error-text">{error}</p> : null}
      </section>

      <section className="stream-list" aria-label="Live streams list">
        {streams.map((stream) => (
          <button
            key={stream.videoId}
            type="button"
            className={`stream-card ${stream.videoId === selectedVideoId ? "active" : ""}`}
            onClick={() => onSelect(stream)}
          >
            {stream.thumbnailUrl ? <img src={stream.thumbnailUrl} alt={stream.title} /> : <div className="thumb-fallback" />}
            <div className="stream-card-body">
              <h2>{stream.title}</h2>
              <p>
                {stream.location.name}, {stream.location.country}
              </p>
              <p>{formatViewers(stream)}</p>
            </div>
          </button>
        ))}

        {!loading && streams.length === 0 ? (
          <div className="empty-state">
            <p>표시할 라이브 방송이 없습니다.</p>
            <p>현재 지도 범위를 이동하거나 줌을 조정해 보세요.</p>
          </div>
        ) : null}
      </section>
    </aside>
  );
}
