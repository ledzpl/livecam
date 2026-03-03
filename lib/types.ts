export type CityPoint = {
  key: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  aliases: string[];
};

export type StreamLocation = {
  name: string;
  country: string;
  lat: number;
  lng: number;
};

export type GeoViewport = {
  north: number;
  south: number;
  east: number;
  west: number;
  zoom: number;
};

export type LiveStream = {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  thumbnailUrl: string;
  publishedAt: string;
  scheduledStartTime?: string;
  actualStartTime?: string;
  viewerCount?: number;
  location: StreamLocation;
};
