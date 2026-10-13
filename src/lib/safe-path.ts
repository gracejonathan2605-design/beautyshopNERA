/** Chemin interne seulement : pas d’autre site, pas de `..` qui change de dossier après coup. */
export function safeNextPath(value: string, fallback: string) {
  const next = value.trim();
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\") || next.includes("://")) {
    return fallback;
  }
  if (next.split(/[?#]/)[0].split("/").some((segment) => segment === "." || segment === "..")) {
    return fallback;
  }
  return next;
}
