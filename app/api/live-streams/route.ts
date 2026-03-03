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
import { fetchLiveDetailsByVideoId, fetchLiveSearchCandidates } from "@/lib/youtube-live-client";

export const revalidate = 300;
const MAX_CHANNEL_SEEDS = 10;
const MAX_CHANNEL_HANDLES = 14;
const MAX_TOTAL_SEEDS = 18;

function mergeSearchSeeds(baseSeeds: SearchSeed[], channelSeeds: SearchSeed[]): SearchSeed[] {
  return dedupeSearchSeeds([...baseSeeds, ...channelSeeds]).slice(0, MAX_TOTAL_SEEDS);
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

  const searchResults = await fetchLiveSearchCandidates(apiKey, activeSeeds);
  const draftStreams = new Map<string, LiveStream>();

  for (const result of searchResults) {
    const fallbackCity = getCityByKey(result.seed.cityKey);

    for (const candidate of result.candidates) {
      if (draftStreams.has(candidate.videoId)) {
        continue;
      }

      const matchedCity =
        detectCityFromSnippet(candidate.title, candidate.description) ??
        (result.seed.source === "channel" ? null : fallbackCity);
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

  return NextResponse.json({
    streams: scopedStreams,
    lastUpdatedAt: new Date().toISOString(),
    searchedSeeds: activeSeeds.length,
    channelSeeds: channelSeeds.length
  });
}
