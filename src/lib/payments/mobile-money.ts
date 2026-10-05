import type { ShopSettings } from "@/lib/settings";
import { reportError } from "@/lib/monitor";
import { orangeConfig, orangeConfigIssue } from "./orange-money";

export type PaymentNetwork = "ORANGE" | "MTN";

export type PaymentInstruction = {
  id: PaymentNetwork;
  label: string;
  title: string;
  code: string;
  name: string;
  detail: string;
  mode: "manual" | "api";
};

const FALLBACK = {
  ORANGE: {
    code: "#150*47*1059897#",
    name: "YORIX DIGITAL GROUP CM",
    detail:
      "Composez le code marchand Orange Money. Le paiement par code marchand se fait sans frais. Indiquez le numéro de commande dans le motif si demandé.",
  },
  MTN: {
    code: "676935195",
    name: "Kouekam Raisa",
    detail:
      "Effectuez un transfert MTN normal vers ce numéro. Précisez le numéro de commande dans le motif. Les frais d’opérateur MTN restent à votre charge.",
  },
};

export function paymentInstructions(settings?: Partial<ShopSettings> | null): Record<PaymentNetwork, PaymentInstruction> {
  const orangeCode = settings?.orangeMerchantCode?.trim() || FALLBACK.ORANGE.code;
  const orangeName = settings?.orangeMerchantName?.trim() || FALLBACK.ORANGE.name;
  const mtnCode = settings?.mtnPhone?.replace(/\s/g, "") || FALLBACK.MTN.code;
  const mtnName = settings?.mtnAccountName?.trim() || FALLBACK.MTN.name;
  const orangeApi = Boolean(orangeConfig());
  const mtnApi = Boolean(process.env.MTN_MOMO_API_URL?.trim() && process.env.MTN_MOMO_API_KEY?.trim());
  return {
    ORANGE: {
      id: "ORANGE",
      label: "Orange Money",
      title: "Payer sans frais avec Orange Money",
      code: orangeCode,
      name: orangeName,
      detail: FALLBACK.ORANGE.detail,
      mode: orangeApi ? "api" : "manual",
    },
    MTN: {
      id: "MTN",
      label: "MTN Mobile Money",
      title: "Transfert MTN Money",
      code: mtnCode,
      name: mtnName,
      detail: FALLBACK.MTN.detail,
      mode: mtnApi ? "api" : "manual",
    },
  };
}

export async function startMobileMoneyCharge(input: {
  network: PaymentNetwork;
  amount: number;
  orderNumber: string;
  phone: string;
  notifUrl?: string;
}) {
  if (input.network === "ORANGE") {
    const issue = orangeConfigIssue();
    if (issue) {
      reportError("orange-money", new Error(issue));
      return { mode: "manual" as const, providerReference: input.network, reason: "not-configured" };
    }
    const { requestOrangeCashIn } = await import("./orange-money");
    const { absoluteUrl } = await import("@/lib/site-url");
    const result = await requestOrangeCashIn({
      amount: input.amount,
      phone: input.phone,
      orderId: input.orderNumber,
      description: `Commande ${input.orderNumber}`,
      notifUrl: input.notifUrl?.trim() || absoluteUrl("/api/payments/orange"),
    });
    if (result.ok) return { mode: "api" as const, providerReference: result.payToken };
    reportError("orange-money", new Error(result.reason));
    return { mode: "manual" as const, providerReference: input.network, reason: result.reason };
  }
  const apiUrl = process.env.MTN_MOMO_API_URL?.trim();
  const apiKey = process.env.MTN_MOMO_API_KEY?.trim();
  if (!apiUrl || !apiKey || input.network !== "MTN") {
    return { mode: "manual" as const, providerReference: input.network };
  }
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      amount: input.amount,
      currency: "XAF",
      orderNumber: input.orderNumber,
      phone: input.phone,
      network: input.network,
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return { mode: "manual" as const, providerReference: input.network, reason: "declined" };
  const body = (await res.json().catch(() => null)) as { reference?: string } | null;
  return { mode: "api" as const, providerReference: body?.reference?.trim() || input.network };
}
