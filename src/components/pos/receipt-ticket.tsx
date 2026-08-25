"use client";

import { useMemo, useRef, useState } from "react";
import {
  buildReceiptText,
  formatReceiptDate,
  moneyPlain,
  paymentLabel,
  whatsappReceiptUrl,
  type ReceiptData,
} from "@/lib/receipt";
import { ReceiptLogo } from "@/components/brand/logo";
import { printReceiptElement, printReceiptFallback } from "@/lib/print-ticket";

export function ReceiptTicket({
  data,
  onClose,
}: {
  data: ReceiptData;
  onClose?: () => void;
}) {
  const [phone, setPhone] = useState(data.customerPhone ?? "");
  const text = useMemo(() => buildReceiptText(data), [data]);
  const paperRef = useRef<HTMLElement>(null);

  function printTicket() {
    if (paperRef.current) printReceiptElement(paperRef.current);
    else printReceiptFallback();
  }

  function sendWhatsApp() {
    window.open(whatsappReceiptUrl(text, phone), "_blank", "noopener,noreferrer");
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#2b1a22]/45 p-4 backdrop-blur-sm sm:items-center">
      <div className="no-print absolute inset-0" onClick={onClose} aria-hidden />
      <div className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-[2rem] bg-white p-5 shadow-2xl">
        <p className="no-print text-center text-xs uppercase tracking-[0.28em] text-brown">
          Ticket de caisse
        </p>
        <article
          ref={paperRef}
          className="receipt-paper mx-auto mt-3 w-[72mm] bg-white px-2 py-3 font-mono text-[11px] leading-4 text-black"
        >
          <header className="text-center">
            <ReceiptLogo />
            <p className="font-serif text-lg leading-5 tracking-[0.18em]">{data.shop.name}</p>
            {data.shop.slogan ? <p className="mt-1 opacity-80">{data.shop.slogan}</p> : null}
            {data.shop.address ? <p>{data.shop.address}</p> : null}
            {data.shop.city ? <p>{data.shop.city}</p> : null}
            {data.shop.phone ? <p>{data.shop.phone}</p> : null}
            {data.shop.email ? <p>{data.shop.email}</p> : null}
            {data.shop.mtnPhone ? <p>MoMo {data.shop.mtnPhone}</p> : null}
            {data.shop.rccm ? <p className="receipt-legal">RCCM {data.shop.rccm}</p> : null}
            {data.shop.nui ? <p className="receipt-legal">NUI {data.shop.nui}</p> : null}
            <p className="receipt-badges mt-2">
              <span>OM</span>
              <span>MoMo</span>
              <span>24h</span>
            </p>
          </header>
          <p className="my-2 border-t border-dashed border-black/40 pt-2">
            {data.number}
            <br />
            {formatReceiptDate(data.date)}
            {data.cashier ? (
              <>
                <br />
                Caisse : {data.cashier}
              </>
            ) : null}
            {data.customer ? (
              <>
                <br />
                Client : {data.customer}
              </>
            ) : null}
          </p>
          <ul className="space-y-1 border-t border-dashed border-black/40 py-2">
            {data.items.map((item, index) => (
              <li key={`${item.name}-${index}`}>
                <p className="uppercase">{item.name}</p>
                <p className="flex justify-between">
                  <span>
                    {item.quantity} × {moneyPlain(item.unitPrice)}
                  </span>
                  <span>{moneyPlain(item.total)}</span>
                </p>
              </li>
            ))}
          </ul>
          <div className="border-t border-dashed border-black/40 pt-2">
            <p className="flex justify-between">
              <span>Sous-total</span>
              <span>{moneyPlain(data.subtotal)}</span>
            </p>
            {data.discount > 0 ? (
              <p className="flex justify-between">
                <span>Remise</span>
                <span>-{moneyPlain(data.discount)}</span>
              </p>
            ) : null}
            <p className="mt-1 flex justify-between text-sm font-bold">
              <span>TOTAL</span>
              <span>{moneyPlain(data.total)}</span>
            </p>
          </div>
          <div className="mt-2 border-t border-dashed border-black/40 pt-2">
            {data.payments.map((payment, index) => (
              <p key={`${payment.method}-${index}`} className="flex justify-between">
                <span>{paymentLabel(payment.method)}</span>
                <span>{moneyPlain(payment.amount)}</span>
              </p>
            ))}
          </div>
          {data.shop.ticketFooter ? (
            <p className="mt-3 text-center opacity-80">{data.shop.ticketFooter}</p>
          ) : null}
          <p className="mt-2 text-center tracking-[0.2em]">MERCI</p>
        </article>

        <div className="no-print mt-5 space-y-3">
          <label className="block text-sm">
            WhatsApp cliente (optionnel)
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="6XX XX XX XX"
              className="mt-1 w-full rounded-2xl border border-black/10 bg-blush px-4 py-3"
            />
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={printTicket} className="rounded-full bg-brown py-3 text-cream">
              Imprimer le ticket
            </button>
            <button type="button" onClick={sendWhatsApp} className="rounded-full bg-[#25D366] py-3 text-white">
              Envoyer WhatsApp
            </button>
          </div>
          <div className="flex gap-3 text-center text-sm">
            <button type="button" onClick={copyText} className="flex-1 underline">
              Copier le texte
            </button>
            {onClose ? (
              <button type="button" onClick={onClose} className="flex-1 underline">
                Fermer
              </button>
            ) : null}
          </div>
          <p className="text-center text-xs text-black/45">
            Impression 80 mm uniquement. Dans Destination, choisissez l’imprimante thermique — pas « Fichier PDF » ni A4.
          </p>
        </div>
      </div>
    </div>
  );
}
