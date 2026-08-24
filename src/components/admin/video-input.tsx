"use client";

import { useState } from "react";
import { MAX_VIDEO_SECONDS } from "@/lib/product-media";

export async function readVideoDuration(file: File) {
  return new Promise<number>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement("video");
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(el.duration);
    };
    el.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Vidéo illisible"));
    };
    el.src = url;
  });
}

export function VideoInput({ label = "1 vidéo (40 s max)" }: { label?: string }) {
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [key, setKey] = useState(0);

  return (
    <label className="text-sm md:col-span-2">
      {label} {seconds ? `· ${Math.round(seconds)} s` : ""}
      <input
        key={key}
        name="video"
        type="file"
        accept="video/mp4,video/webm"
        className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
        onChange={async (event) => {
          setError("");
          setSeconds(0);
          const file = event.target.files?.[0];
          if (!file) return;
          try {
            const duration = await readVideoDuration(file);
            if (duration > MAX_VIDEO_SECONDS) {
              setError("La vidéo doit durer 40 secondes maximum.");
              setKey((n) => n + 1);
              return;
            }
            setSeconds(duration);
          } catch {
            setError("Impossible de lire la vidéo. Utilisez un fichier mp4.");
            setKey((n) => n + 1);
          }
        }}
      />
      <input type="hidden" name="videoDuration" value={String(seconds)} />
      {error ? <p className="mt-1 text-xs text-red-700">{error}</p> : null}
    </label>
  );
}
