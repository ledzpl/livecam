import type { CityPoint } from "@/lib/types";

export const CITY_CATALOG: CityPoint[] = [
  { key: "seoul", name: "Seoul", country: "South Korea", lat: 37.5665, lng: 126.978, aliases: ["seoul", "gangnam", "hongdae", "myeongdong", "서울"] },
  { key: "busan", name: "Busan", country: "South Korea", lat: 35.1796, lng: 129.0756, aliases: ["busan", "haeundae", "부산"] },
  { key: "tokyo", name: "Tokyo", country: "Japan", lat: 35.6762, lng: 139.6503, aliases: ["tokyo", "shibuya", "ginza", "東京"] },
  { key: "osaka", name: "Osaka", country: "Japan", lat: 34.6937, lng: 135.5023, aliases: ["osaka", "dotonbori", "大阪"] },
  { key: "taipei", name: "Taipei", country: "Taiwan", lat: 25.033, lng: 121.5654, aliases: ["taipei", "台北"] },
  { key: "hong-kong", name: "Hong Kong", country: "China", lat: 22.3193, lng: 114.1694, aliases: ["hong kong", "kowloon", "hk"] },
  { key: "singapore", name: "Singapore", country: "Singapore", lat: 1.3521, lng: 103.8198, aliases: ["singapore", "marina bay"] },
  { key: "bangkok", name: "Bangkok", country: "Thailand", lat: 13.7563, lng: 100.5018, aliases: ["bangkok", "กรุงเทพ"] },
  { key: "new-york", name: "New York", country: "United States", lat: 40.7128, lng: -74.006, aliases: ["new york", "manhattan", "times square", "nyc"] },
  { key: "los-angeles", name: "Los Angeles", country: "United States", lat: 34.0522, lng: -118.2437, aliases: ["los angeles", "hollywood"] },
  { key: "san-francisco", name: "San Francisco", country: "United States", lat: 37.7749, lng: -122.4194, aliases: ["san francisco", "golden gate"] },
  { key: "las-vegas", name: "Las Vegas", country: "United States", lat: 36.1699, lng: -115.1398, aliases: ["las vegas", "vegas"] },
  { key: "chicago", name: "Chicago", country: "United States", lat: 41.8781, lng: -87.6298, aliases: ["chicago"] },
  { key: "london", name: "London", country: "United Kingdom", lat: 51.5072, lng: -0.1276, aliases: ["london", "trafalgar", "piccadilly"] },
  { key: "paris", name: "Paris", country: "France", lat: 48.8566, lng: 2.3522, aliases: ["paris", "eiffel"] },
  { key: "berlin", name: "Berlin", country: "Germany", lat: 52.52, lng: 13.405, aliases: ["berlin"] },
  { key: "rome", name: "Rome", country: "Italy", lat: 41.9028, lng: 12.4964, aliases: ["rome", "roma"] },
  { key: "barcelona", name: "Barcelona", country: "Spain", lat: 41.3874, lng: 2.1686, aliases: ["barcelona"] },
  { key: "amsterdam", name: "Amsterdam", country: "Netherlands", lat: 52.3676, lng: 4.9041, aliases: ["amsterdam"] },
  { key: "istanbul", name: "Istanbul", country: "Turkey", lat: 41.0082, lng: 28.9784, aliases: ["istanbul"] },
  { key: "dubai", name: "Dubai", country: "United Arab Emirates", lat: 25.2048, lng: 55.2708, aliases: ["dubai", "burj"] },
  { key: "sydney", name: "Sydney", country: "Australia", lat: -33.8688, lng: 151.2093, aliases: ["sydney", "opera house"] },
  { key: "melbourne", name: "Melbourne", country: "Australia", lat: -37.8136, lng: 144.9631, aliases: ["melbourne"] },
  { key: "vancouver", name: "Vancouver", country: "Canada", lat: 49.2827, lng: -123.1207, aliases: ["vancouver"] },
  { key: "toronto", name: "Toronto", country: "Canada", lat: 43.6532, lng: -79.3832, aliases: ["toronto"] },
  { key: "mexico-city", name: "Mexico City", country: "Mexico", lat: 19.4326, lng: -99.1332, aliases: ["mexico city"] },
  { key: "rio", name: "Rio de Janeiro", country: "Brazil", lat: -22.9068, lng: -43.1729, aliases: ["rio", "rio de janeiro"] }
];

export const CITY_BY_KEY = new Map(CITY_CATALOG.map((city) => [city.key, city]));
