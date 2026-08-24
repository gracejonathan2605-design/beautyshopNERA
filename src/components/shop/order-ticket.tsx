"use client";

import { useState } from "react";
import { ReceiptTicket } from "@/components/pos/receipt-ticket";
import type { ReceiptData } from "@/lib/receipt";

export function OrderTicketButton({ data }: { data: ReceiptData }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full bg-brown px-6 py-3 text-cream"
        >
          Ticket — imprimer ou WhatsApp
        </button>
      </div>
      {open ? <ReceiptTicket data={data} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
