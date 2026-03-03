import type { SearchSeed } from "@/lib/live-search-seeds";

type YouTubeSearchItem = {
  id?: {
    videoId?: string;
  };
  snippet?: {
    liveBroadcastContent?: string;
    title?: string;
    description?: string;
    channelTitle?: string;
    publishedAt?: string;
    thumbnails?: {
      medium?: { url?: string };
      high?: { url?: string };
      default?: { url?: string };
    };
  };
};

type YouTubeSearchResponse = {
  items?: YouTubeSearchItem[];
};

type YouTubeApiErrorPayload = {
  error?: {
    code?: number;
    message?: string;
    errors?: Array<{
      reason?: string;
      message?: string;
    }>;
  };
};

type YouTubeVideoItem = {
  id?: string;
  liveStreamingDetails?: {
    actualStartTime?: string;
    scheduledStartTime?: string;
    concurrentViewers?: string;
  };
};

type YouTubeVideosResponse = {
  items?: YouTubeVideoItem[];
};

const SEARCH_ENDPOINT = "https://www.googleapis.com/youtube/v3/search";
const VIDEO_DETAILS_ENDPOINT = "https://www.googleapis.com/youtube/v3/videos";
const YOUTUBE_REQUEST_TIMEOUT_MS = 12000;
const SEARCH_MAX_RESULTS = "10";

export type LiveSearchCandidate = {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  publishedAt: string;
  thumbnailUrl: string;
};

export type LiveDetails = {
  actualStartTime?: string;
  scheduledStartTime?: string;
  viewerCount?: number;
};

export type LiveSearchFailure = {
  seed: SearchSeed;
  statusCode: number | null;
  reason: string;
  message: string;
};

export type LiveSearchResult = {
  seed: SearchSeed;
  candidates: LiveSearchCandidate[];
};

export type LiveSearchBatch = {
  results: LiveSearchResult[];
  failures: LiveSearchFailure[];
};

class YouTubeSearchError extends Error {
  statusCode: number | null;
  reason: string;
  seed: SearchSeed;

  constructor(seed: SearchSeed, statusCode: number | null, reason: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.reason = reason;
    this.seed = seed;
  }
}

function thumbnailFromSnippet(item: YouTubeSearchItem): string {
  return (
    item.snippet?.thumbnails?.high?.url ??
    item.snippet?.thumbnails?.medium?.url ??
    item.snippet?.thumbnails?.default?.url ??
    ""
  );
}

function buildTimeoutSignal(): AbortSignal | undefined {
  const timeout = (AbortSignal as { timeout?: (ms: number) => AbortSignal }).timeout;
  return timeout ? timeout(YOUTUBE_REQUEST_TIMEOUT_MS) : undefined;
}

async function fetchLiveSearch(apiKey: string, seed: SearchSeed): Promise<YouTubeSearchItem[]> {
  const params = new URLSearchParams({
    key: apiKey,
    part: "snippet",
    type: "video",
    eventType: "live",
    videoEmbeddable: "true",
    maxResults: SEARCH_MAX_RESULTS,
    q: seed.query
  });

  if (seed.channelId) {
    params.set("channelId", seed.channelId);
  }

  const response = await fetch(`${SEARCH_ENDPOINT}?${params.toString()}`, {
    headers: {
      Accept: "application/json"
    },
    signal: buildTimeoutSignal(),
    next: {
      revalidate: 300
    }
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as YouTubeApiErrorPayload | null;
    const reason = payload?.error?.errors?.[0]?.reason ?? "unknown_error";
    const message = payload?.error?.message ?? `HTTP ${response.status}`;
    throw new YouTubeSearchError(seed, response.status, reason, message);
  }

  const data = (await response.json()) as YouTubeSearchResponse;
  return data.items ?? [];
}

export async function fetchLiveSearchCandidates(
  apiKey: string,
  seeds: SearchSeed[]
): Promise<LiveSearchBatch> {
  const settled = await Promise.allSettled(seeds.map((seed) => fetchLiveSearch(apiKey, seed)));
  const results: LiveSearchResult[] = [];
  const failures: LiveSearchFailure[] = [];

  settled.forEach((result, index) => {
    const seed = seeds[index];

    if (result.status !== "fulfilled") {
      const reason =
        result.reason instanceof YouTubeSearchError ? result.reason.reason : "request_failed";
      const statusCode =
        result.reason instanceof YouTubeSearchError ? result.reason.statusCode : null;
      const message =
        result.reason instanceof YouTubeSearchError
          ? result.reason.message
          : result.reason instanceof Error
            ? result.reason.message
            : "Unknown error";

      failures.push({
        seed,
        statusCode,
        reason,
        message
      });
      return;
    }

    const candidates = result.value
      .map((item): LiveSearchCandidate | null => {
        const videoId = item.id?.videoId;
        if (!videoId) {
          return null;
        }

        return {
          videoId,
          title: item.snippet?.title ?? "Untitled Live",
          description: item.snippet?.description ?? "",
          channelTitle: item.snippet?.channelTitle ?? "Unknown Channel",
          publishedAt: item.snippet?.publishedAt ?? "",
          thumbnailUrl: thumbnailFromSnippet(item)
        };
      })
      .filter((candidate): candidate is LiveSearchCandidate => Boolean(candidate));

    results.push({ seed, candidates });
  });

  return { results, failures };
}

export async function fetchLiveDetailsByVideoId(
  apiKey: string,
  videoIds: string[]
): Promise<Map<string, LiveDetails>> {
  if (videoIds.length === 0) {
    return new Map();
  }

  const params = new URLSearchParams({
    key: apiKey,
    part: "liveStreamingDetails",
    id: videoIds.join(","),
    maxResults: "50"
  });

  const response = await fetch(`${VIDEO_DETAILS_ENDPOINT}?${params.toString()}`, {
    headers: {
      Accept: "application/json"
    },
    signal: buildTimeoutSignal(),
    next: {
      revalidate: 300
    }
  });

  if (!response.ok) {
    return new Map();
  }

  const data = (await response.json()) as YouTubeVideosResponse;
  const map = new Map<string, LiveDetails>();

  for (const item of data.items ?? []) {
    if (!item.id) {
      continue;
    }

    const detail = item.liveStreamingDetails;
    const viewerCount = detail?.concurrentViewers ? Number(detail.concurrentViewers) : undefined;
    map.set(item.id, {
      actualStartTime: detail?.actualStartTime,
      scheduledStartTime: detail?.scheduledStartTime,
      viewerCount: Number.isFinite(viewerCount) ? viewerCount : undefined
    });
  }

  return map;
}
