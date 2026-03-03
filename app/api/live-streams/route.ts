import { NextResponse } from "next/server";

import {
  buildWhitelistSeedsByCity,
  cityKeysFromSeeds,
  collectWhitelistHandlesByCity,
  dedupeSearchSeeds
} from "@/lib/channel-whitelist";
import { isPointInViewport } from "@/lib/geo";
import { ASIA_SEARCH_SEEDS, type SearchSeed } from "@/lib/live-search-seeds";
import { buildSeedsForViewport, parseViewportFromRequest } from "@/lib/map-viewport";
import { detectCityFromSnippet, getCityByKey } from "@/lib/location-matcher";
import type { LiveStream } from "@/lib/types";
import { resolveChannelIdsByHandle } from "@/lib/youtube-channel-client";
import {
  fetchLiveDetailsByVideoId,
  fetchLiveSearchCandidates,
  type LiveSearchFailure
} from "@/lib/youtube-live-client";

export const revalidate = 300;
const MAX_CHANNEL_SEEDS = 2;
const MAX_CHANNEL_HANDLES = 6;
const MAX_TOTAL_SEEDS = 8;

function mergeSearchSeeds(baseSeeds: SearchSeed[], channelSeeds: SearchSeed[]): SearchSeed[] {
  return dedupeSearchSeeds([...baseSeeds, ...channelSeeds]).slice(0, MAX_TOTAL_SEEDS);
}

function failureMessageFromYouTubeErrors(failures: LiveSearchFailure[]): string {
  const reasons = new Set(failures.map((failure) => failure.reason));

  if (reasons.has("quotaExceeded") || reasons.has("dailyLimitExceeded")) {
    return "YouTube API 할당량(quota)을 초과했습니다. 잠시 후 다시 시도하거나 API 키 quota를 확인해 주세요.";
  }

  if (reasons.has("keyInvalid") || reasons.has("forbidden") || reasons.has("accessNotConfigured")) {
    return "YOUTUBE_API_KEY가 유효하지 않거나 YouTube Data API 권한 설정에 문제가 있습니다.";
  }

  const first = failures[0];
  const status = first?.statusCode ?? "ERR";
  const reason = first?.reason ?? "unknown_error";
  return `YouTube 검색 요청이 실패했습니다. (${status}, ${reason})`;
}

export async function GET(request: Request): Promise<Response> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const viewport = parseViewportFromRequest(request);
  const baseSeeds = viewport ? buildSeedsForViewport(viewport) : ASIA_SEARCH_SEEDS;

  if (!apiKey) {
    return NextResponse.json(
      {
        streams: [],
        message: "YOUTUBE_API_KEY 가 설정되지 않았습니다.",
        lastUpdatedAt: new Date().toISOString()
      },
      { status: 200 }
    );
  }

  const activeCityKeys = cityKeysFromSeeds(baseSeeds.length > 0 ? baseSeeds : ASIA_SEARCH_SEEDS);
  const whitelistHandles = collectWhitelistHandlesByCity(activeCityKeys, MAX_CHANNEL_HANDLES);
  const handleChannelMap =
    whitelistHandles.length > 0 ? await resolveChannelIdsByHandle(apiKey, whitelistHandles) : new Map();
  const channelSeeds = buildWhitelistSeedsByCity(activeCityKeys, handleChannelMap, MAX_CHANNEL_SEEDS);
  const activeSeeds = mergeSearchSeeds(baseSeeds, channelSeeds);

  const searchBatch = await fetchLiveSearchCandidates(apiKey, activeSeeds);
  if (searchBatch.results.length === 0 && searchBatch.failures.length === activeSeeds.length) {
    return NextResponse.json({
      streams: [],
      message: failureMessageFromYouTubeErrors(searchBatch.failures),
      lastUpdatedAt: new Date().toISOString(),
      searchedSeeds: activeSeeds.length,
      channelSeeds: channelSeeds.length,
      failedSeeds: searchBatch.failures.length
    });
  }

  const draftStreams = new Map<string, LiveStream>();

  for (const result of searchBatch.results) {
    const fallbackCity = getCityByKey(result.seed.cityKey);

    for (const candidate of result.candidates) {
      if (draftStreams.has(candidate.videoId)) {
        continue;
      }

      const matchedCity = detectCityFromSnippet(candidate.title, candidate.description) ?? fallbackCity;
      if (!matchedCity) {
        continue;
      }

      draftStreams.set(candidate.videoId, {
        videoId: candidate.videoId,
        title: candidate.title,
        description: candidate.description,
        channelTitle: candidate.channelTitle,
        publishedAt: candidate.publishedAt,
        thumbnailUrl: candidate.thumbnailUrl,
        location: {
          name: matchedCity.name,
          country: matchedCity.country,
          lat: matchedCity.lat,
          lng: matchedCity.lng
        }
      });
    }
  }

  const draftList = Array.from(draftStreams.values());
  const detailsMap = await fetchLiveDetailsByVideoId(
    apiKey,
    draftList.map((stream) => stream.videoId)
  );

  const streams = draftList
    .map((stream) => {
      const detail = detailsMap.get(stream.videoId);
      return {
        ...stream,
        viewerCount: detail?.viewerCount,
        actualStartTime: detail?.actualStartTime,
        scheduledStartTime: detail?.scheduledStartTime
      };
    })
    .sort((a, b) => {
      const aViewers = a.viewerCount ?? 0;
      const bViewers = b.viewerCount ?? 0;
      if (aViewers !== bViewers) {
        return bViewers - aViewers;
      }
      return a.title.localeCompare(b.title);
    });

  const scopedStreams = viewport
    ? streams.filter((stream) => isPointInViewport(stream.location.lat, stream.location.lng, viewport))
    : streams;

  const message =
    scopedStreams.length === 0
      ? searchBatch.failures.length > 0
        ? failureMessageFromYouTubeErrors(searchBatch.failures)
        : "현재 지도 범위에서 검색된 라이브 방송이 없습니다. 지도를 이동하거나 줌 아웃 후 다시 시도해 주세요."
      : undefined;

  return NextResponse.json({
    streams: scopedStreams,
    message,
    lastUpdatedAt: new Date().toISOString(),
    searchedSeeds: activeSeeds.length,
    channelSeeds: channelSeeds.length,
    failedSeeds: searchBatch.failures.length
  });
}
