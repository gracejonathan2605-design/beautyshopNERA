export function safeNextPath(value: string, fallback: string) {
  const next = value.trim();
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\") || next.includes("://")) {
    return fallback;
  }
  return next;
}
