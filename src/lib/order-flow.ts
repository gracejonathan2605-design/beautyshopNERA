import type { OrderStatus } from "@prisma/client";

const OPEN: OrderStatus[] = ["PENDING", "CONFIRMED", "PREPARING", "READY"];

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "READY", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["SHIPPED", "DELIVERED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "REFUNDED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus) {
  if (from === to) return true;
  return ORDER_TRANSITIONS[from].includes(to);
}

export function stockEffectForTransition(from: OrderStatus, to: OrderStatus): "none" | "ship" | "release" | "restock" {
  if (from === to) return "none";
  const shipping = to === "SHIPPED" || to === "DELIVERED";
  const alreadyShipped = from === "SHIPPED" || from === "DELIVERED";
  if (shipping && OPEN.includes(from)) return "ship";
  if ((to === "CANCELLED" || to === "REFUNDED") && OPEN.includes(from)) return "release";
  if (to === "REFUNDED" && alreadyShipped) return "restock";
  return "none";
}
