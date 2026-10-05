"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Interroge Orange quelques secondes après l’autre, puis rafraîchit seulement si l’état change. */
export function OrderPaymentWatch({
  number,
  token,
  state,
}: {
  number: string;
  token: string;
  state: "pending" | "refused";
}) {
  const router = useRouter();

  useEffect(() => {
    let stopped = false;
    async function tick() {
      if (stopped) return;
      try {
        const res = await fetch(
          `/api/orders/${encodeURIComponent(number)}/payment?t=${encodeURIComponent(token)}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const body = (await res.json()) as { state?: string };
        if (stopped || !body.state || body.state === state) return;
        if (body.state === "paid" || body.state === "refused") {
          stopped = true;
          router.refresh();
        }
      } catch {
        /* le prochain passage réessaie */
      }
    }
    const first = window.setTimeout(tick, 4000);
    const later = window.setInterval(tick, 6000);
    return () => {
      stopped = true;
      window.clearTimeout(first);
      window.clearInterval(later);
    };
  }, [number, router, state, token]);

  return null;
}
