import { cookies } from "next/headers";
import { CART_COUNT_COOKIE } from "./cart-count";

export type CartItem = {
  variantId: string;
  quantity: number;
};

const CART_COOKIE = "nera_cart";
export { CART_COUNT_COOKIE };

export function cartQuantity(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function normalizeCartItems(items: CartItem[]): CartItem[] {
  const byId = new Map<string, number>();
  for (const item of items) {
    const variantId = String(item?.variantId ?? "").trim();
    const quantity = Math.floor(Number(item?.quantity));
    if (!variantId || !Number.isFinite(quantity) || quantity <= 0) continue;
    byId.set(variantId, (byId.get(variantId) ?? 0) + quantity);
  }
  return [...byId.entries()].map(([variantId, quantity]) => ({ variantId, quantity }));
}

export async function getCart(): Promise<CartItem[]> {
  const jar = await cookies();
  const raw = jar.get(CART_COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? normalizeCartItems(parsed) : [];
  } catch {
    return [];
  }
}

export async function saveCart(items: CartItem[]) {
  const jar = await cookies();
  const normalized = normalizeCartItems(items);
  jar.set(CART_COOKIE, JSON.stringify(normalized), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  const count = cartQuantity(normalized);
  if (count > 0) {
    jar.set(CART_COUNT_COOKIE, String(count), {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  } else {
    jar.delete({ name: CART_COUNT_COOKIE, path: "/" });
  }
  return count;
}

export async function clearCart() {
  const jar = await cookies();
  jar.delete({ name: CART_COOKIE, path: "/" });
  jar.delete({ name: CART_COUNT_COOKIE, path: "/" });
}

export function upsertCartItem(items: CartItem[], variantId: string, quantity: number) {
  return normalizeCartItems([...items.filter((i) => i.variantId !== variantId), { variantId, quantity }]);
}

/** Quantité après un ajout, plafonnée au stock. `capped` : le stock empêchait d’augmenter. */
export function nextCartQuantity(current: number, add: number, available: number) {
  const safeAdd = Number.isFinite(add) && add > 0 ? Math.floor(add) : 1;
  if (available <= 0) return { ok: false as const };
  const quantity = Math.min(Math.max(0, current) + safeAdd, available);
  return { ok: true as const, quantity, capped: quantity === Math.max(0, current) };
}

export function reorderCartMerge(
  cart: CartItem[],
  items: { variantId: string; quantity: number }[],
  availableFor: (variantId: string) => number,
) {
  let added = 0;
  let skipped = 0;
  let already = 0;
  let next = cart;
  for (const item of items) {
    const available = availableFor(item.variantId);
    if (available <= 0) {
      skipped += 1;
      continue;
    }
    const current = next.find((row) => row.variantId === item.variantId)?.quantity ?? 0;
    const qty = Math.min(current + item.quantity, available);
    if (qty > current) added += 1;
    else already += 1;
    next = upsertCartItem(next, item.variantId, qty);
  }
  return { cart: next, added, skipped, already };
}

export function cartCanCheckout(
  rows: { available: number; quantity: number }[],
  cookieLineCount = rows.length,
) {
  return (
    rows.length > 0 &&
    rows.length === cookieLineCount &&
    rows.every((row) => row.available >= row.quantity && row.quantity > 0)
  );
}

export function checkoutLinesFromCart(
  cart: CartItem[],
  availableByVariant: Map<string, number>,
): { ok: true; lines: CartItem[] } | { ok: false; reason: "empty" | "stale" | "unavailable" } {
  const lines = normalizeCartItems(cart);
  if (!lines.length) return { ok: false, reason: "empty" };
  for (const item of lines) {
    if (!availableByVariant.has(item.variantId)) return { ok: false, reason: "stale" };
    const available = availableByVariant.get(item.variantId) ?? 0;
    if (available < item.quantity) return { ok: false, reason: "unavailable" };
  }
  return { ok: true, lines };
}
