import type { MetadataRoute } from "next";
import { getTrendingAnime, getPopularThisSeason, getTopRatedAnime } from "@/lib/catalog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://nekoflix.vercel.app";

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/search`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/schedule`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/watchlist`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/mylibrary`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/auth/login`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/auth/register`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];

  const [trending, popular, topRated] = await Promise.all([
    getTrendingAnime(20),
    getPopularThisSeason(20),
    getTopRatedAnime(20),
  ]);

  const animeIds = new Set<number>();
  [...trending, ...popular, ...topRated].forEach((a) => animeIds.add(a.id));

  const animeRoutes: MetadataRoute.Sitemap = Array.from(animeIds).map((id) => ({
    url: `${baseUrl}/anime/${id}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...animeRoutes];
}
