"use client";

import { useState } from "react";
import Image from "next/image";

type Media = { id: string; url: string; alt: string | null; kind: "IMAGE" | "VIDEO" };

export function ProductGallery({ name, media }: { name: string; media: Media[] }) {
  const photos = media.filter((m) => m.kind === "IMAGE");
  const video = media.find((m) => m.kind === "VIDEO");
  const [active, setActive] = useState(0);
  const current = photos[active] ?? photos[0];

  return (
    <div>
      <div className="relative min-h-80 overflow-hidden rounded-[2rem] bg-linear-to-br from-blush to-champagne">
        {current ? (
          <Image
            src={current.url}
            alt={current.alt ?? name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
            loading={active === 0 ? "eager" : "lazy"}
            priority={active === 0}
          />
        ) : (
          <h1 className="relative p-8 font-serif text-5xl text-brown">{name}</h1>
        )}
      </div>
      {photos.length > 1 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {photos.map((photo, index) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setActive(index)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl ${index === active ? "ring-2 ring-brown" : ""}`}
            >
              <Image src={photo.url} alt="" fill className="object-cover" sizes="64px" loading="lazy" />
            </button>
          ))}
        </div>
      ) : null}
      {video ? (
        <video
          className="mt-4 w-full rounded-[1.5rem] bg-black"
          src={video.url}
          controls
          playsInline
          preload="metadata"
        />
      ) : null}
    </div>
  );
}
