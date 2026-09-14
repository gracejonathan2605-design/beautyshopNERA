"use client";

import { useEffect, useId, useRef, useState } from "react";
import { requestPhotoDescriptionSuggestion } from "@/lib/photo-description-client";
import type { PhotoDescriptionDraft } from "@/lib/photo-description";

type Status = "idle" | "loading" | "ready" | "error" | "applied" | "ignored";

export function PhotoDescriptionSuggestion({
  file,
  hintName,
  hintCategory,
  compact = false,
  className = "",
  onApply,
}: {
  file: File | null;
  hintName?: string;
  hintCategory?: string;
  compact?: boolean;
  className?: string;
  onApply: (draft: PhotoDescriptionDraft) => void;
}) {
  const labelId = useId();
  const hintRef = useRef({ name: hintName, category: hintCategory });
  hintRef.current = { name: hintName, category: hintCategory };
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [longDraft, setLongDraft] = useState("");
  const fileKey = file ? `${file.name}:${file.size}:${file.lastModified}` : "";

  useEffect(() => {
    if (!file) {
      setStatus("idle");
      setError("");
      setDraft("");
      setLongDraft("");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    setError("");
    setDraft("");
    setLongDraft("");
    void requestPhotoDescriptionSuggestion(file, hintRef.current).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error);
        setStatus("error");
        return;
      }
      setDraft(result.shortDescription);
      setLongDraft(result.description);
      setStatus("ready");
    });
    return () => {
      cancelled = true;
    };
  }, [file, fileKey]);

  if (!file || status === "idle") return null;

  if (status === "loading") {
    return (
      <aside
        className={`rounded-xl border border-[#eee0e6] bg-white px-3 py-3 ${className}`}
        role="status"
        aria-live="polite"
      >
        <p className="text-sm text-black/60">Analyse de la photo… suggestion de description en cours.</p>
      </aside>
    );
  }

  if (status === "error") {
    return (
      <aside className={`rounded-xl bg-amber-50 px-3 py-3 text-sm text-amber-950 ${className}`}>
        <p>{error}</p>
        <button
          type="button"
          className="mt-2 text-sm underline"
          onClick={() => {
            if (!file) return;
            setStatus("loading");
            setError("");
            void requestPhotoDescriptionSuggestion(file, hintRef.current).then((result) => {
              if (!result.ok) {
                setError(result.error);
                setStatus("error");
                return;
              }
              setDraft(result.shortDescription);
              setLongDraft(result.description);
              setStatus("ready");
            });
          }}
        >
          Réessayer
        </button>
      </aside>
    );
  }

  if (status === "applied") {
    return (
      <p className={`text-sm text-emerald-800 ${className}`}>
        Suggestion utilisée. Vous pouvez encore modifier la description ci-dessus.
      </p>
    );
  }

  if (status === "ignored") {
    return (
      <p className={`text-sm text-black/50 ${className}`}>
        Suggestion ignorée.{" "}
        <button type="button" className="underline" onClick={() => setStatus("ready")}>
          Revoir
        </button>
      </p>
    );
  }

  return (
    <aside className={`rounded-xl border border-[#eee0e6] bg-white p-3 ${className}`}>
      <p className="text-xs uppercase tracking-[0.16em] text-gold">Suggestion</p>
      <p className="mt-1 text-sm text-black/55">
        {compact
          ? "Modifiez si besoin, puis utilisez ou ignorez."
          : "D’après la première photo. Vous pouvez modifier le texte, l’utiliser, ou l’ignorer."}
      </p>
      <label htmlFor={labelId} className="sr-only">
        Suggestion de description
      </label>
      <textarea
        id={labelId}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        rows={compact ? 2 : 3}
        className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            const shortDescription = draft.trim();
            if (!shortDescription) return;
            onApply({
              shortDescription,
              description: longDraft.trim() || shortDescription,
            });
            setStatus("applied");
          }}
          className="rounded-full bg-brown px-4 py-2 text-sm text-cream disabled:opacity-40"
          disabled={!draft.trim()}
        >
          Utiliser
        </button>
        <button type="button" onClick={() => setStatus("ignored")} className="rounded-full border px-4 py-2 text-sm">
          Ignorer
        </button>
      </div>
    </aside>
  );
}
