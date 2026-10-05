"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { launchOrangePayment } from "@/app/actions/shop";
import { orangeUssdHref } from "@/lib/payments/orange-money";

export function OrangePayLaunch({
  code,
  name,
  auto = false,
  orderNumber,
  accessToken = "",
  api = false,
}: {
  code: string;
  name: string;
  auto?: boolean;
  orderNumber?: string;
  accessToken?: string;
  api?: boolean;
}) {
  const href = orangeUssdHref(code);
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, startLaunch] = useTransition();

  function launch() {
    if (!orderNumber || pending) return;
    startLaunch(async () => {
      const result = await launchOrangePayment(orderNumber, accessToken);
      if (result.ok) {
        setMessage("Demande envoyée. Saisissez votre code secret sur le téléphone.");
        router.refresh();
        return;
      }
      if (result.pending) {
        setMessage("La demande Orange Money est en cours d’envoi sur votre téléphone.");
        window.setTimeout(() => router.refresh(), 4000);
        return;
      }
      setMessage(result.error ?? "La demande automatique n’a pas abouti.");
    });
  }

  useEffect(() => {
    if (!auto || !api || !orderNumber) return;
    const key = `nera-om-api:${orderNumber}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      return;
    }
    launch();
    // Le lancement automatique ne doit partir qu’une fois par commande.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, api, orderNumber]);

  useEffect(() => {
    if (api || !auto || !href) return;
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
  }, [api, auto, href]);

  if (api && orderNumber) {
    return (
      <div className="mt-4">
        <button
          type="button"
          onClick={launch}
          disabled={pending}
          className="flex w-full flex-col items-center rounded-full bg-brown px-6 py-4 text-center text-cream disabled:opacity-60"
        >
          <span className="text-sm">{pending ? "Envoi de la demande…" : "Lancer Orange Money"}</span>
          <span className="mt-1 text-xs text-cream/80">Demande automatique sur votre téléphone</span>
        </button>
        {message ? <p className="mt-3 text-center text-sm text-wine">{message}</p> : null}
        {href ? (
          <a href={href} className="mt-3 block text-center text-sm text-black/55 underline">
            Ou composer {code}
          </a>
        ) : (
          <p className="mt-3 text-center font-serif text-2xl text-wine">{code}</p>
        )}
        <p className="mt-1 text-center text-xs text-black/45">{name}</p>
      </div>
    );
  }

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
