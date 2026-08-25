import { cookies } from "next/headers";

export type CartItem = {
  variantId: string;
  quantity: number;
};

const CART_COOKIE = "nera_cart";

export async function getCart(): Promise<CartItem[]> {
  const jar = await cookies();
  const raw = jar.get(CART_COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed.filter((i) => i.variantId && i.quantity > 0) : [];
  } catch {
    return [];
  }
}

export async function saveCart(items: CartItem[]) {
  const jar = await cookies();
  jar.set(CART_COOKIE, JSON.stringify(items), {
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
  const next = items.filter((i) => i.variantId !== variantId);
  if (quantity > 0) next.push({ variantId, quantity });
  return next;
}
