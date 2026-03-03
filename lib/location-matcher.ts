import { CITY_CATALOG, CITY_BY_KEY } from "@/lib/city-catalog";
import type { CityPoint } from "@/lib/types";

type AliasMatcher = {
  city: CityPoint;
  alias: string;
  pattern: RegExp;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ALIAS_MATCHERS: AliasMatcher[] = CITY_CATALOG.flatMap((city) =>
  city.aliases.map((alias) => ({
    city,
    alias,
    pattern: new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalize(alias))}([^a-z0-9]|$)`, "i")
  }))
).sort((a, b) => b.alias.length - a.alias.length);

export function detectCityFromText(text: string): CityPoint | null {
  const normalized = normalize(text);
  if (!normalized) {
    return null;
  }

  for (const matcher of ALIAS_MATCHERS) {
    if (matcher.pattern.test(normalized)) {
      return matcher.city;
    }
  }

  return null;
}

export function detectCityFromSnippet(title: string, description: string): CityPoint | null {
  return detectCityFromText(`${title} ${description}`);
}

export function getCityByKey(key: string): CityPoint | null {
  return CITY_BY_KEY.get(key) ?? null;
}
