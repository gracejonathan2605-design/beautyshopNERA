import { CANONICAL_SITE_URL } from "./nera-identity";

function stripSlash(url: string) {
  return url.replace(/\/$/, "");
}

function isLocalHost(url: string) {
  return /localhost|127\.0\.0\.1/.test(url);
}

/** URL canonique publique. En production, ignore APP_URL si c’est vercel.app ou un ancien domaine. */
export function getSiteUrl() {
  if (process.env.VERCEL_ENV === "production") return CANONICAL_SITE_URL;
  const app = process.env.APP_URL?.trim() ? stripSlash(process.env.APP_URL.trim()) : "";
  if (app && isLocalHost(app)) return app;
  return CANONICAL_SITE_URL;
}

export function absoluteUrl(path = "/") {
  const base = getSiteUrl();
  if (!path || path === "/") return `${base}/`;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
