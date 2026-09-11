import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

const PRIVATE = ["/login", "/admin", "/pos", "/compte", "/checkout", "/panier", "/commande", "/api/"];

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/sitemap.xml", "/llms.txt"],
        disallow: PRIVATE,
      },
      {
        userAgent: [
          "Googlebot",
          "Googlebot-Image",
          "Bingbot",
          "GPTBot",
          "ChatGPT-User",
          "ClaudeBot",
          "PerplexityBot",
          "Google-Extended",
          "Applebot-Extended",
        ],
        allow: ["/", "/sitemap.xml", "/llms.txt"],
        disallow: PRIVATE,
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base.replace(/^https?:\/\//, ""),
  };
}
