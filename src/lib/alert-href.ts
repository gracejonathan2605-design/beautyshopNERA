export function orderNumberFromAlert(message: string) {
  return message.match(/^Commande\s+(\S+)/)?.[1] ?? null;
}

export function alertLinksToOrder(type: string) {
  return type === "NEW_ORDER" || type === "PAYMENT_REFUSED";
}

export function alertFallbackHref(type: string) {
  if (type === "STOCK_LOW" || type === "STOCK_OUT") return "/admin/stocks/renouveler";
  return alertLinksToOrder(type) ? "/admin/commandes" : "/admin/stocks";
}
