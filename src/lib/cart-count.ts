export const CART_COUNT_COOKIE = "nera_cart_n";

export function readCartCountCookie(raw?: string | null) {
  const count = Number.parseInt(String(raw ?? ""), 10);
  return Number.isFinite(count) && count > 0 ? count : 0;
}
