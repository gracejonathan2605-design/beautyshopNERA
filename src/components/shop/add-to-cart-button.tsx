"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

export function AddToCartButton({
  action,
  label = "Ajouter au panier",
  className = "mt-8 rounded-full bg-brown px-8 py-3 text-cream disabled:opacity-60",
}: {
  action: () => Promise<{ ok?: boolean } | void>;
  label?: string;
  className?: string;
}) {
  const [pending, start] = useTransition();
  const [added, setAdded] = useState(false);
  const [blocked, setBlocked] = useState(false);

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          start(async () => {
            setBlocked(false);
            const result = await action();
            if (result && result.ok === false) {
              setBlocked(true);
              return;
            }
            setAdded(true);
            window.setTimeout(() => setAdded(false), 5000);
          });
        }}
        className={`disabled:opacity-60 ${className}`}
      >
        {pending ? "Ajout…" : label}
      </button>
      {blocked ? (
        <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-2 text-sm text-amber-900" role="status">
          Cet article n’est plus disponible pour le moment.
        </p>
      ) : null}
      {added ? (
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
