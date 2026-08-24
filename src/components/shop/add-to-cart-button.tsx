"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

export function AddToCartButton({
  action,
  label = "Ajouter au panier",
}: {
  action: () => Promise<void>;
  label?: string;
}) {
  const [pending, start] = useTransition();
  const [added, setAdded] = useState(false);

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          start(async () => {
            await action();
            setAdded(true);
            window.setTimeout(() => setAdded(false), 5000);
          });
        }}
        className="mt-8 rounded-full bg-brown px-8 py-3 text-cream disabled:opacity-60"
      >
        {pending ? "Ajout…" : label}
      </button>
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
