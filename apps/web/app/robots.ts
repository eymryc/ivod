import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://ivod.africa";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/films", "/series", "/animation", "/web-series", "/content/", "/search", "/creator/"],
        disallow: ["/watch/", "/studio/", "/admin/", "/settings/", "/profiles/", "/api/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
