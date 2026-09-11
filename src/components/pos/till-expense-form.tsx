"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { submitTillExpense, type TillExpenseResult } from "@/app/actions/pos";
import { PendingSubmitButton } from "@/components/admin/form-pending";
import type { TillSnapshot } from "@/lib/till";

const INITIAL: TillExpenseResult | null = null;

export function TillExpenseForm({
  sessionId,
  categories,
  onSnapshot,
}: {
  sessionId: string;
  categories: { id: string; name: string }[];
  onSnapshot: (snapshot: TillSnapshot, message: string) => void;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(submitTillExpense, INITIAL);

  useEffect(() => {
    if (!state?.ok) return;
    onSnapshot(state.snapshot, state.message);
    formRef.current?.reset();
    router.refresh();
  }, [state, onSnapshot, router]);

  return (
    <form ref={formRef} action={action} className="rounded-2xl border border-[#eee0e6] p-4">
      <h3 className="font-medium text-wine">Ajouter une dépense</h3>
      <p className="mt-1 text-sm text-black/50">
        Taxi, eau, courses… le montant est retiré des espèces attendues tout de suite.
      </p>
      <input type="hidden" name="sessionId" value={sessionId} />
      <input
        name="description"
        required
        placeholder="Motif (ex. taxi, bouteille d’eau)"
        className="mt-3 w-full rounded-xl border border-[#eee0e6] px-3 py-2 text-sm"
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <input
          name="amount"
          inputMode="numeric"
          required
          placeholder="Montant FCFA (ex. 2000)"
          className="min-w-[8rem] flex-1 rounded-xl border border-[#eee0e6] px-3 py-2 text-sm"
        />
        <select name="categoryId" className="min-w-[9rem] flex-1 rounded-xl border border-[#eee0e6] px-3 py-2 text-sm">
          {categories.length ? (
            categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))
          ) : (
            <option value="">Autre</option>
          )}
        </select>
      </div>
      {state && !state.ok ? (
        <p className="mt-2 text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}
      <PendingSubmitButton
        idle="Enregistrer la dépense"
        pendingLabel="Déduction…"
        className="mt-3 rounded-full bg-brown px-5 py-2 text-sm text-cream disabled:cursor-not-allowed disabled:opacity-60"
      />
    </form>
  );
}
