import { cookies } from "next/headers";

export type CartItem = {
  variantId: string;
  quantity: number;
};

const CART_COOKIE = "nera_cart";

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
  jar.set(CART_COOKIE, JSON.stringify(normalizeCartItems(items)), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearCart() {
  const jar = await cookies();
  jar.delete(CART_COOKIE);
}

export function upsertCartItem(items: CartItem[], variantId: string, quantity: number) {
  return normalizeCartItems([...items.filter((i) => i.variantId !== variantId), { variantId, quantity }]);
}
