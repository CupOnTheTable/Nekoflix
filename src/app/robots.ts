import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/auth/", "/account", "/watchlist", "/mylibrary"],
    },
    sitemap: "https://nekoflix.vercel.app/sitemap.xml",
  };
}
