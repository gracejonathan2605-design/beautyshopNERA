import { slugify } from "@/lib/pricing";

export function skuBaseFromName(name: string) {
  return slugify(name).replace(/-/g, "").slice(0, 10).toUpperCase() || "NER";
}

export function buildAutoSku(name: string, now = Date.now(), attempt = 0) {
  const base = skuBaseFromName(name);
  const stamp = now.toString(36).toUpperCase().slice(-4);
  return attempt === 0 ? `${base}-${stamp}` : `${base}-${stamp}${attempt}`;
}
