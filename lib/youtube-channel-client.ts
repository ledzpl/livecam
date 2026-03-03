type YouTubeChannelItem = {
  id?: string;
};

type YouTubeChannelsResponse = {
  items?: YouTubeChannelItem[];
};

const CHANNEL_ENDPOINT = "https://www.googleapis.com/youtube/v3/channels";
const CHANNEL_REQUEST_TIMEOUT_MS = 10000;
const CHANNEL_CACHE_TTL_MS = 1000 * 60 * 60 * 12;

type CacheEntry = {
  channelId: string | null;
  expiresAt: number;
};

const channelIdCache = new Map<string, CacheEntry>();
const inFlightResolutions = new Map<string, Promise<string | null>>();

function buildTimeoutSignal(): AbortSignal | undefined {
  const timeout = (AbortSignal as { timeout?: (ms: number) => AbortSignal }).timeout;
  return timeout ? timeout(CHANNEL_REQUEST_TIMEOUT_MS) : undefined;
}

function nowMs(): number {
  return Date.now();
}

export function normalizeChannelHandle(handle: string): string {
  const trimmed = handle.trim().toLowerCase();
  if (!trimmed) {
    return "";
  }
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

async function fetchChannelIdByHandle(apiKey: string, normalizedHandle: string): Promise<string | null> {
  const handle = normalizedHandle.replace(/^@/, "");
  if (!handle) {
    return null;
  }

  const params = new URLSearchParams({
    key: apiKey,
    part: "id",
    forHandle: handle,
    maxResults: "1"
  });

  const response = await fetch(`${CHANNEL_ENDPOINT}?${params.toString()}`, {
    headers: {
      Accept: "application/json"
    },
    signal: buildTimeoutSignal(),
    next: {
      revalidate: 3600
    }
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as YouTubeChannelsResponse;
  const channelId = data.items?.[0]?.id;
  return channelId ?? null;
}

async function resolveSingleChannelId(apiKey: string, handle: string): Promise<string | null> {
  const normalizedHandle = normalizeChannelHandle(handle);
  if (!normalizedHandle) {
    return null;
  }

  const cached = channelIdCache.get(normalizedHandle);
  if (cached && cached.expiresAt > nowMs()) {
    return cached.channelId;
  }

  const running = inFlightResolutions.get(normalizedHandle);
  if (running) {
    return running;
  }

  const resolver = fetchChannelIdByHandle(apiKey, normalizedHandle)
    .then((channelId) => {
      channelIdCache.set(normalizedHandle, {
        channelId,
        expiresAt: nowMs() + CHANNEL_CACHE_TTL_MS
      });
      return channelId;
    })
    .finally(() => {
      inFlightResolutions.delete(normalizedHandle);
    });

  inFlightResolutions.set(normalizedHandle, resolver);
  return resolver;
}

export async function resolveChannelIdsByHandle(
  apiKey: string,
  handles: string[]
): Promise<Map<string, string>> {
  const uniqueHandles = Array.from(new Set(handles.map(normalizeChannelHandle).filter(Boolean)));
  const resolved = await Promise.all(
    uniqueHandles.map(async (handle) => ({
      handle,
      channelId: await resolveSingleChannelId(apiKey, handle)
    }))
  );

  const map = new Map<string, string>();
  for (const item of resolved) {
    if (item.channelId) {
      map.set(item.handle, item.channelId);
    }
  }

  return map;
}
