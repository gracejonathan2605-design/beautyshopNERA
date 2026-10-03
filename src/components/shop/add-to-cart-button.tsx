"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { notifyCartCount } from "@/components/shop/cart-badge";

export function AddToCartButton({
  action,
  label = "Ajouter au panier",
  className = "mt-8 rounded-full bg-brown px-8 py-3 text-cream disabled:opacity-60",
}: {
  action: () => Promise<{ ok?: boolean; count?: number; capped?: boolean } | void>;
  label?: string;
  className?: string;
}) {
  const [pending, start] = useTransition();
  const [notice, setNotice] = useState<"added" | "blocked" | "capped" | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          start(async () => {
            setNotice(null);
            const result = await action();
            if (result && result.ok === false) {
              setNotice("blocked");
              return;
            }
            if (result && typeof result.count === "number") notifyCartCount(result.count);
            if (result && "capped" in result && result.capped) {
              setNotice("capped");
              return;
            }
            setNotice("added");
            window.setTimeout(() => setNotice((current) => (current === "added" ? null : current)), 5000);
          });
        }}
        className={`disabled:opacity-60 ${className}`}
      >
        {pending ? "Ajout…" : label}
      </button>
      {notice === "blocked" ? (
        <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-2 text-sm text-amber-900" role="status">
          Cet article n’est plus disponible pour le moment.
        </p>
      ) : null}
      {notice === "capped" ? (
        <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-2 text-sm text-amber-900" role="status">
          Quantité déjà au maximum du stock.
        </p>
      ) : null}
      {notice === "added" ? (
        <p className="mt-3 rounded-2xl bg-emerald-50 px-4 py-2 text-sm text-emerald-900" role="status">
          Produit ajouté au panier.{" "}
          <Link href="/panier" className="underline">
            Voir le panier
          </Link>
        </p>
      ) : null}
    </div>
  );
}
