import type { MetadataRoute } from "next";

const BASE = process.env.APP_URL ?? "https://nerabeaute.cm";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/login", "/admin", "/pos", "/compte", "/checkout", "/panier", "/commande"],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
