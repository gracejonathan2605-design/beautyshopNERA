"use client";

import { useEffect } from "react";
import { orangeUssdHref } from "@/lib/payments/orange-money";

export function OrangePayLaunch({
  code,
  name,
  auto = false,
}: {
  code: string;
  name: string;
  auto?: boolean;
}) {
  const href = orangeUssdHref(code);

  useEffect(() => {
    if (!auto || !href) return;
    const mobile = window.matchMedia("(pointer: coarse)").matches;
    if (!mobile) return;
    const key = `nera-om:${href}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      return;
    }
    window.location.assign(href);
  }, [auto, href]);

  if (!href) {
    return <p className="mt-3 font-serif text-3xl text-wine">{code}</p>;
  }

  return (
    <a href={href} className="mt-4 flex flex-col items-center rounded-full bg-brown px-6 py-4 text-center text-cream">
      <span className="text-sm">Lancer Orange Money</span>
      <span className="mt-1 font-serif text-3xl">{code}</span>
      <span className="mt-1 text-xs text-cream/80">{name}</span>
    </a>
  );
}
