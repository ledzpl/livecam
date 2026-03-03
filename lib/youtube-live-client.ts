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
    throw new Error(`YouTube search request failed (${seed.query}): ${response.status}`);
  }

  const data = (await response.json()) as YouTubeSearchResponse;
  return data.items ?? [];
}

export async function fetchLiveSearchCandidates(
  apiKey: string,
  seeds: SearchSeed[]
): Promise<Array<{ seed: SearchSeed; candidates: LiveSearchCandidate[] }>> {
  const settled = await Promise.allSettled(seeds.map((seed) => fetchLiveSearch(apiKey, seed)));

  return settled.flatMap((result, index) => {
    if (result.status !== "fulfilled") {
      return [];
    }

    const seed = seeds[index];
    const candidates = result.value
      .map((item): LiveSearchCandidate | null => {
        if (
          item.snippet?.liveBroadcastContent &&
          item.snippet.liveBroadcastContent !== "live"
        ) {
          return null;
        }

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

    return [{ seed, candidates }];
  });
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
