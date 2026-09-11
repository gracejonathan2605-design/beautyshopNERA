/** Colle depuis Green API : « apiUrl: https://… » ou l’URL seule. */
export function normalizeGreenApiUrl(raw?: string | null) {
  let value = (raw ?? "").trim().replace(/^apiUrl\s*[:=]\s*/i, "");
  value = value.replace(/^["']|["']$/g, "").replace(/\/$/, "");
  if (!value) return "";
  if (value.startsWith("http://")) value = `https://${value.slice(7)}`;
  else if (!/^https:\/\//i.test(value) && /green-?api/i.test(value)) value = `https://${value.replace(/^\/+/, "")}`;
  value = value.replace(/\/waInstance.*$/i, "").replace(/\/$/, "");
  return value;
}

/** Colle depuis Green API : « idInstance: 1103… » ou la valeur seule. */
export function normalizeGreenApiId(raw?: string | null) {
  let value = (raw ?? "").trim().replace(/^(?:idInstance|id)\s*[:=]\s*/i, "");
  value = value.replace(/^["']|["']$/g, "").trim();
  const digits = value.replace(/\D/g, "");
  return digits || value;
}

/** Colle depuis Green API : « apiTokenInstance: … » ou le token seul. */
export function normalizeGreenApiToken(raw?: string | null) {
  let value = (raw ?? "").trim().replace(/^apiTokenInstance\s*[:=]\s*/i, "");
  return value.replace(/^["']|["']$/g, "").trim();
}
