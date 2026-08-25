export function orderNumberFromAlert(message: string) {
  return message.match(/^Commande\s+(\S+)/)?.[1] ?? null;
}

export function alertFallbackHref(type: string) {
  return type === "NEW_ORDER" ? "/admin/commandes" : "/admin/stocks";
}
