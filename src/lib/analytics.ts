export const GTM_ID = "GTM-T973VWFC";
export const GA_MEASUREMENT_ID = "G-PNJ2MC62V3";

export const ANALYTICS_COOKIE = "nera_analytics";
export const ANALYTICS_MAX_AGE = 60 * 60 * 24 * 180;

export type AnalyticsChoice = "granted" | "denied";

export function parseAnalyticsCookie(cookieHeader: string): AnalyticsChoice | null {
  const row = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ANALYTICS_COOKIE}=`));
  const value = row?.slice(ANALYTICS_COOKIE.length + 1);
  if (value === "granted" || value === "denied") return value;
  return null;
}

export function analyticsCookieAssignment(choice: AnalyticsChoice, secure: boolean) {
  return `${ANALYTICS_COOKIE}=${choice}; path=/; max-age=${ANALYTICS_MAX_AGE}; samesite=lax${secure ? "; secure" : ""}`;
}

export function analyticsScriptUrls() {
  return {
    ga: `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`,
    gtm: `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`,
  };
}
