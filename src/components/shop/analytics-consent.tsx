"use client";

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  GA_MEASUREMENT_ID,
  GTM_ID,
  type AnalyticsChoice,
  analyticsCookieAssignment,
  parseAnalyticsCookie,
} from "@/lib/analytics";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let started = false;

export function startAnalytics() {
  if (started || typeof document === "undefined") return;
  started = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID);
  const ga = document.createElement("script");
  ga.async = true;
  ga.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(ga);
  window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  const gtm = document.createElement("script");
  gtm.async = true;
  gtm.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
  document.head.appendChild(gtm);
}

let forceAsk = false;
const listeners = new Set<() => void>();

function emitConsent() {
  listeners.forEach((listener) => listener());
}

function subscribeConsent(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function consentSnapshot() {
  if (forceAsk) return "ask";
  return parseAnalyticsCookie(document.cookie) ?? "ask";
}

export function requestAnalyticsChoice() {
  forceAsk = true;
  emitConsent();
}

function persist(choice: AnalyticsChoice) {
  const secure = window.location.protocol === "https:";
  document.cookie = analyticsCookieAssignment(choice, secure);
}

export function AnalyticsConsent() {
  const choice = useSyncExternalStore(subscribeConsent, consentSnapshot, () => "pending");

  useEffect(() => {
    if (choice === "granted") startAnalytics();
  }, [choice]);

  function choose(next: AnalyticsChoice) {
    forceAsk = false;
    persist(next);
    emitConsent();
    if (next === "granted") {
      startAnalytics();
      return;
    }
    if (started) window.location.reload();
  }

  if (choice !== "ask") return null;

  return (
    <div
      role="dialog"
      aria-labelledby="analytics-consent-title"
      className="fixed inset-x-3 z-50 rounded-2xl border border-[#eee0e6] bg-white p-4 shadow-lg bottom-[calc(4.6rem+env(safe-area-inset-bottom))] md:bottom-4 md:left-auto md:right-4 md:max-w-md"
    >
      <p id="analytics-consent-title" className="font-medium text-wine">
        Mesure d’audience
      </p>
      <p className="mt-2 text-sm leading-relaxed text-black/70">
        Google Analytics et Google Tag Manager ne se chargent que si vous acceptez. Le panier et la commande
        fonctionnent dans les deux cas.{" "}
        <Link href="/confidentialite" className="text-wine underline decoration-wine/30 underline-offset-2">
          Confidentialité
        </Link>
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => choose("denied")}
          className="rounded-full border border-[#eee0e6] px-4 py-2.5 text-sm text-wine"
        >
          Refuser
        </button>
        <button type="button" onClick={() => choose("granted")} className="rounded-full bg-brown px-4 py-2.5 text-sm text-cream">
          Accepter
        </button>
      </div>
    </div>
  );
}

export function AnalyticsChoiceButton() {
  return (
    <button type="button" onClick={() => requestAnalyticsChoice()} className="text-wine underline-offset-2 hover:underline">
      Mesure d’audience
    </button>
  );
}
