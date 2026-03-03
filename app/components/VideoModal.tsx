"use client";

import { useEffect } from "react";

import type { LiveStream } from "@/lib/types";

type VideoModalProps = {
  stream: LiveStream | null;
  onClose: () => void;
};

function formatViewerCount(viewers?: number): string {
  if (!viewers) {
    return "시청자 수 정보 없음";
  }

  return `${viewers.toLocaleString()}명 시청 중`;
}

export default function VideoModal({ stream, onClose }: VideoModalProps) {
  useEffect(() => {
    if (!stream) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [stream, onClose]);

  if (!stream) {
    return null;
  }

  return (
    <div
      className="video-modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="video-modal-card">
        <div className="video-modal-header">
          <div>
            <h2>{stream.title}</h2>
            <p>
              {stream.location.name}, {stream.location.country} · {stream.channelTitle}
            </p>
          </div>
          <button type="button" onClick={onClose} className="ghost-button" aria-label="Close">
            닫기
          </button>
        </div>

        <div className="video-embed-wrapper">
          <iframe
            src={`https://www.youtube.com/embed/${stream.videoId}?autoplay=1&mute=1`}
            title={stream.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>

        <div className="video-modal-meta">
          <span>{formatViewerCount(stream.viewerCount)}</span>
          {stream.actualStartTime ? <span>시작: {new Date(stream.actualStartTime).toLocaleString()}</span> : null}
        </div>
      </div>
    </div>
  );
}
