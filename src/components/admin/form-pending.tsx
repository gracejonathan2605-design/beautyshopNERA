"use client";

import { useFormStatus } from "react-dom";

export function FormBusyOverlay({
  active,
  title,
  detail,
}: {
  active: boolean;
  title: string;
  detail: string;
}) {
  if (!active) return null;
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#2b1a22]/55 p-4 backdrop-blur-sm"
      role="status"
      aria-live="assertive"
    >
      <div className="w-full max-w-sm rounded-[1.8rem] border border-[#eee0e6] bg-white p-7 text-center shadow-2xl">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-blush border-t-brown" />
        <p className="mt-4 font-serif text-2xl text-wine">{title}</p>
        <p className="mt-2 text-sm leading-relaxed text-black/60">{detail}</p>
        <p className="mt-4 text-xs uppercase tracking-[0.18em] text-gold">Ne fermez pas la page</p>
      </div>
    </div>
  );
}

export function PendingSubmitButton({
  idle,
  pendingLabel,
  disabled,
  pending: pendingProp,
  className = "rounded-full bg-brown py-3 text-cream disabled:cursor-not-allowed disabled:opacity-60 md:col-span-4",
}: {
  idle: string;
  pendingLabel: string;
  disabled?: boolean;
  pending?: boolean;
  className?: string;
}) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;
  const busy = pending || disabled;
  return (
    <button type="submit" disabled={busy} className={className} aria-busy={pending}>
      {pending ? pendingLabel : idle}
    </button>
  );
}
