"use client";

function OmMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" aria-hidden>
      <circle cx="12" cy="12" r="11" fill="currentColor" />
      <text x="12" y="16" textAnchor="middle" fontSize="9" fontWeight="800" fill="#ff6a00">
        OM
      </text>
    </svg>
  );
}

function MomoMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" aria-hidden>
      <circle cx="12" cy="12" r="11" fill="#1a1200" />
      <text x="12" y="16" textAnchor="middle" fontSize="7" fontWeight="800" fill="#ffcc00">
        MM
      </text>
    </svg>
  );
}

function FastMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" aria-hidden>
      <path
        fill="currentColor"
        d="M3 13h8l-1.2 7L21 11h-8l1.2-7L3 13zm11.2-2H19l-6.4 7.2.7-4.2H9.8L14.2 11z"
      />
    </svg>
  );
}

export function PayDeliveryBadges({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${compact ? "" : "justify-center sm:justify-start"}`}
      aria-label="Payer par Orange Money ou MoMo, livraison rapide sous 24h"
    >
      <span className="pay-om" title="Payer par Orange Money">
        <OmMark />
        {compact ? "OM" : "Orange Money"}
      </span>
      <span className="pay-momo" title="Payer par MTN Mobile Money">
        <MomoMark />
        {compact ? "MoMo" : "MTN MoMo"}
      </span>
      <span className="pay-24h" title="Livraison rapide sous 24h">
        <FastMark />
        {compact ? "24h" : "Livraison 24h"}
      </span>
    </div>
  );
}

export function ShopLegalBlock({
  rccm,
  nui,
  email,
  mtnPhone,
  className = "",
}: {
  rccm?: string;
  nui?: string;
  email?: string;
  mtnPhone?: string;
  className?: string;
}) {
  return (
    <div className={`space-y-1 text-xs leading-relaxed text-black/50 ${className}`}>
      {email ? (
        <p>
          <a href={`mailto:${email}`} className="underline decoration-black/20 hover:text-wine">
            {email}
          </a>
        </p>
      ) : null}
      {mtnPhone ? <p>MoMo / MTN : {mtnPhone}</p> : null}
      {rccm ? <p>RCCM {rccm}</p> : null}
      {nui ? <p>NUI {nui}</p> : null}
    </div>
  );
}
