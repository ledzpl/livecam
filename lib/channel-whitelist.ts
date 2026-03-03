import { CITY_BY_KEY } from "@/lib/city-catalog";
import type { SearchSeed } from "@/lib/live-search-seeds";
import { normalizeChannelHandle } from "@/lib/youtube-channel-client";

export type ChannelWhitelistEntry = {
  cityKey: string;
  handles: string[];
  tags: string[];
};

// 기본값은 보수적으로 유지하고, 실제 운영에서는 검증된 handle로 교체/추가하는 것을 권장합니다.
export const ASIA_CHANNEL_WHITELIST: ChannelWhitelistEntry[] = [
  {
    cityKey: "seoul",
    handles: ["@KBSNews", "@MBCNEWS11", "@SBS8news"],
    tags: ["seoul", "gangnam", "myeongdong", "서울"]
  },
  {
    cityKey: "busan",
    handles: ["@KBSNews", "@MBCNEWS11"],
    tags: ["busan", "haeundae", "부산"]
  },
  {
    cityKey: "tokyo",
    handles: ["@ANNnewsCH", "@TBSNEWSDIG", "@ntv_news"],
    tags: ["tokyo", "shibuya", "東京"]
  },
  {
    cityKey: "osaka",
    handles: ["@ANNnewsCH", "@TBSNEWSDIG"],
    tags: ["osaka", "dotonbori", "大阪"]
  },
  {
    cityKey: "taipei",
    handles: ["@TVBSNEWS01", "@setn"],
    tags: ["taipei", "台北"]
  },
  {
    cityKey: "hong-kong",
    handles: ["@RTHK"],
    tags: ["hong kong", "kowloon", "hk"]
  },
  {
    cityKey: "singapore",
    handles: ["@channelnewsasia"],
    tags: ["singapore", "marina bay"]
  },
  {
    cityKey: "bangkok",
    handles: ["@ThaiPBS"],
    tags: ["bangkok", "กรุงเทพ"]
  }
];

export function cityKeysFromSeeds(seeds: SearchSeed[]): string[] {
  return Array.from(new Set(seeds.map((seed) => seed.cityKey)));
}

export function collectWhitelistHandlesByCity(cityKeys: string[], maxHandles = Number.POSITIVE_INFINITY): string[] {
  const citySet = new Set(cityKeys);
  const handles = new Set<string>();

  for (const entry of ASIA_CHANNEL_WHITELIST) {
    if (citySet.size > 0 && !citySet.has(entry.cityKey)) {
      continue;
    }

    for (const handle of entry.handles) {
      const normalized = normalizeChannelHandle(handle);
      if (normalized) {
        handles.add(normalized);
        if (handles.size >= maxHandles) {
          return Array.from(handles);
        }
      }
    }
  }

  return Array.from(handles);
}

export function buildWhitelistSeedsByCity(
  cityKeys: string[],
  handleChannelMap: Map<string, string>,
  maxSeeds: number
): SearchSeed[] {
  if (maxSeeds <= 0) {
    return [];
  }

  const citySet = new Set(cityKeys);
  const seeds: SearchSeed[] = [];
  const seen = new Set<string>();

  for (const entry of ASIA_CHANNEL_WHITELIST) {
    if (citySet.size > 0 && !citySet.has(entry.cityKey)) {
      continue;
    }

    const city = CITY_BY_KEY.get(entry.cityKey);
    if (!city) {
      continue;
    }

    const queryTag = entry.tags[0] ?? city.name;

    for (const handle of entry.handles) {
      const normalized = normalizeChannelHandle(handle);
      const channelId = normalized ? handleChannelMap.get(normalized) : undefined;
      if (!channelId) {
        continue;
      }

      const dedupeKey = `${entry.cityKey}|${channelId}`;
      if (seen.has(dedupeKey)) {
        continue;
      }

      seen.add(dedupeKey);
      seeds.push({
        cityKey: entry.cityKey,
        query: `${queryTag} live webcam`,
        channelId,
        source: "channel"
      });

      if (seeds.length >= maxSeeds) {
        return seeds;
      }
    }
  }

  return seeds;
}

export function dedupeSearchSeeds(seeds: SearchSeed[]): SearchSeed[] {
  const deduped: SearchSeed[] = [];
  const seen = new Set<string>();

  for (const seed of seeds) {
    const key = `${seed.cityKey}|${seed.query}|${seed.channelId ?? ""}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(seed);
  }

  return deduped;
}
