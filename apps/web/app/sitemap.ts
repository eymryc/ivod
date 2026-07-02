import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://ivod.africa";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/films`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/series`, lastModified: new Date(), changeFrequency: "daily", priority: 0.85 },
    { url: `${BASE}/animation`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.75 },
    { url: `${BASE}/web-series`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.75 },
    { url: `${BASE}/search`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE}/auth/login`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/auth/register`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  ];

  // Contenus publiés
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/contents?status=PUBLISHED&limit=200`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const json = await res.json();
      const contents: any[] = json.data?.items ?? json.data ?? [];
      const contentRoutes: MetadataRoute.Sitemap = contents.map((c) => ({
        url: `${BASE}/content/${c.id}`,
        lastModified: new Date(c.updatedAt ?? c.publishedAt ?? Date.now()),
        changeFrequency: "weekly",
        priority: 0.8,
      }));
      return [...staticRoutes, ...contentRoutes];
    }
  } catch { /* ignore — retourner les routes statiques */ }

  return staticRoutes;
}
