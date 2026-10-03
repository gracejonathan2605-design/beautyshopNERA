const BOUTIQUE_PREFIXES = ["/boutique", "/produit", "/categorie", "/flash", "/marques"] as const;

export function isShopTabActive(href: "/" | "/boutique" | "/compte", path: string) {
  if (href === "/") return path === "/";
  if (href === "/compte") return path === "/compte" || path.startsWith("/compte/");
  return BOUTIQUE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}
