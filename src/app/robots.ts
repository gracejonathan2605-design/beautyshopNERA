import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

const PRIVATE = ["/login", "/admin", "/pos", "/compte", "/checkout", "/panier", "/commande", "/api/"];

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: PRIVATE,
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
