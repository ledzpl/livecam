export type SearchSeed = {
  cityKey: string;
  query: string;
  channelId?: string;
  source?: "query" | "channel";
};

export const ASIA_SEARCH_SEEDS: SearchSeed[] = [
  { cityKey: "seoul", query: "seoul live webcam", source: "query" },
  { cityKey: "busan", query: "busan live webcam", source: "query" },
  { cityKey: "tokyo", query: "tokyo live webcam", source: "query" },
  { cityKey: "osaka", query: "osaka live webcam", source: "query" },
  { cityKey: "taipei", query: "taipei live webcam", source: "query" },
  { cityKey: "hong-kong", query: "hong kong live webcam", source: "query" },
  { cityKey: "singapore", query: "singapore live webcam", source: "query" },
  { cityKey: "bangkok", query: "bangkok live webcam", source: "query" }
];
