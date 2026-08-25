import type { MetadataRoute } from "next";

const BASE = process.env.APP_URL ?? "https://nerabeaute.cm";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE}/`, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/flash`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE}/boutique`, changeFrequency: "daily", priority: 0.8 },
  ];
}
