import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  orangeApiTarget,
  orangeCashInAccepted,
  orangeCustomerPaymentError,
  ORANGE_BALANCE_NOTICE,
  orangeConfig,
  orangeConfigIssue,
  readOrangeReference,
  orangePaymentStatus,
  requestOrangeCashIn,
  resetOrangeTokenCache,
} from "../src/lib/payments/orange-money";

const classicEnv = {
  ORANGE_MONEY_API_URL: "https://api-s1.orange.cm/omcoreapis/1.0.2",
  ORANGE_MONEY_USERNAME: "client",
  ORANGE_MONEY_PASSWORD: "secret",
  ORANGE_MONEY_AUTH_TOKEN: "auth-token",
  ORANGE_MONEY_CHANNEL_MSISDN: "699000111",
  ORANGE_MONEY_PIN: "1234",
} as unknown as NodeJS.ProcessEnv;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

afterEach(() => {
  resetOrangeTokenCache();
});

describe("cible API Orange Money", () => {
  it("retire le chemin pour ne pas doubler /token ni /mp", () => {
    expect(orangeApiTarget("https://api-s1.orange.cm/omcoreapis/1.0.2")).toEqual({
      origin: "https://api-s1.orange.cm",
      kind: "classic",
    });
    expect(orangeApiTarget("https://api-s1.orange.cm/token/").origin).toBe("https://api-s1.orange.cm");
    expect(orangeApiTarget(undefined)).toEqual({ origin: "https://api-s1.orange.cm", kind: "classic" });
  });

  it("reconnaît l’encaissement Paynote", () => {
    expect(orangeApiTarget("https://omapi.ynote.africa/prod/webpayment")).toEqual({
      origin: "https://omapi.ynote.africa",
      kind: "paynote",
    });
  });

  it("signale un numéro marchand qui n’est pas un mobile", () => {
    expect(
      orangeConfigIssue({
        ...classicEnv,
        ORANGE_MONEY_CHANNEL_MSISDN: "#150*47*1059897#",
      }),
    ).toBe("invalid-channel-msisdn");
    expect(orangeConfig(classicEnv)?.channelUserMsisdn).toBe("699000111");
  });
});

describe("réponse Orange", () => {
  it("accepte le paiement seulement si le téléphone doit saisir le code", () => {
    expect(
      orangeCashInAccepted({
        message: "Merchant payment successfully initiated",
        data: { inittxnstatus: "200", status: "PENDING" },
      }),
    ).toBe(true);
    expect(orangeCashInAccepted({ data: { inittxnstatus: "600", status: "FAILED" } })).toBe(false);
    expect(orangeCashInAccepted({ message: "Push sent to customer" })).toBe(true);
    expect(
      orangeCashInAccepted({
        StatusCode: 200,
        body: "Pay Request Accepted",
        parameters: { MessageId: "MPNOTE1" },
      }),
    ).toBe(true);
    expect(readOrangeReference({ parameters: { MessageId: "MPNOTE1" } })).toBe("MPNOTE1");
    expect(
      orangeCashInAccepted({
        StatusCode: 200,
        parameters: { MessageId: "MPNOTE2", operation: "OM_CMR collection ussd-mut" },
      }),
    ).toBe(true);
  });
});

describe("demande de paiement", () => {
  it("appelle token, init et pay sur l’hôte, même si l’URL contient déjà le chemin", async () => {
    const calls: { url: string; method: string; headers: Headers; body?: string }[] = [];
    const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
      const href = String(url);
      calls.push({
        url: href,
        method: init?.method ?? "GET",
        headers: new Headers(init?.headers),
        body: typeof init?.body === "string" ? init.body : undefined,
      });
      if (href.endsWith("/token")) return jsonResponse({ access_token: "tok", expires_in: 3600 });
      if (href.endsWith("/mp/init")) return jsonResponse({ data: { payToken: "MPCLASSIC1" } });
      return jsonResponse({
        message: "Merchant payment successfully initiated",
        data: { inittxnstatus: "200", status: "PENDING", payToken: "MPCLASSIC1" },
      });
    }) as typeof fetch;

    const result = await requestOrangeCashIn(
      {
        amount: 15000,
        phone: "+237 6 99 11 22 33",
        orderId: "NERA-2026-000010",
        description: "Commande",
        notifUrl: "https://nerabeaute237.com/api/payments/orange",
      },
      { env: classicEnv, fetchImpl },
    );

    expect(result).toEqual({ ok: true, payToken: "MPCLASSIC1" });
    expect(calls.map((call) => call.url)).toEqual([
      "https://api-s1.orange.cm/token",
      "https://api-s1.orange.cm/omcoreapis/1.0.2/mp/init",
      "https://api-s1.orange.cm/omcoreapis/1.0.2/mp/pay",
    ]);
    expect(calls[1]?.headers.has("Content-Type")).toBe(false);
    expect(calls[1]?.headers.get("X-AUTH-TOKEN")).toBe("auth-token");
    expect(JSON.parse(calls[2]?.body ?? "{}")).toMatchObject({
      subscriberMsisdn: "699112233",
      channelUserMsisdn: "699000111",
      amount: "15000",
      payToken: "MPCLASSIC1",
    });
  });

  it("relance le push si /mp/pay n’a pas confirmé l’invite", async () => {
    const urls: string[] = [];
    const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
      const href = String(url);
      urls.push(href);
      if (href.endsWith("/token")) return jsonResponse({ access_token: "tok", expires_in: 3600 });
      if (href.endsWith("/mp/init")) return jsonResponse({ data: { payToken: "MPUSH1" } });
      if (href.endsWith("/mp/pay")) return jsonResponse({ data: { inittxnstatus: "600", status: "FAILED" } });
      expect(init?.method).toBe("GET");
      return jsonResponse({ message: "Push sent to customer", data: { inittxnstatus: "200", payToken: "MPUSH1" } });
    }) as typeof fetch;

    const result = await requestOrangeCashIn(
      {
        amount: 10000,
        phone: "699112233",
        orderId: "NERA-1",
        description: "Commande",
        notifUrl: "https://nerabeaute237.com/api/payments/orange",
      },
      { env: classicEnv, fetchImpl },
    );
    expect(result).toEqual({ ok: true, payToken: "MPUSH1" });
    expect(urls.at(-1)).toBe("https://api-s1.orange.cm/omcoreapis/1.0.2/mp/push/MPUSH1");
  });

  it("envoie l’encaissement Paynote sans code marchand ni PIN", async () => {
    let payBody = "";
    const urls: string[] = [];
    const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
      const href = String(url);
      urls.push(href);
      if (href.endsWith("/oauth2/token")) return jsonResponse({ access_token: "tok", expires_in: 300 });
      payBody = String(init?.body ?? "");
      return jsonResponse({
        StatusCode: 200,
        body: "Pay Request Accepted",
        parameters: { MessageId: "MPNOTE1", operation: "OM_CMR collection ussd-mut" },
      });
    }) as typeof fetch;

    const result = await requestOrangeCashIn(
      {
        amount: 20000,
        phone: "0699112233",
        orderId: "NERA-2",
        description: "Commande",
        notifUrl: "https://nerabeaute237.com/api/payments/orange",
      },
      {
        env: {
          ORANGE_MONEY_API_URL: "https://omapi.ynote.africa/prod/webpayment",
          ORANGE_MONEY_USERNAME: "client-id",
          ORANGE_MONEY_PASSWORD: "client-secret",
          ORANGE_MONEY_AUTH_TOKEN: "customer-key",
        } as unknown as NodeJS.ProcessEnv,
        fetchImpl,
      },
    );

    expect(result).toEqual({ ok: true, payToken: "MPNOTE1" });
    expect(urls).toEqual([
      "https://omapi-token.ynote.africa/oauth2/token",
      "https://omapi.ynote.africa/prod/webpayment",
    ]);
    const sent = JSON.parse(payBody) as { API_MUT: Record<string, string> };
    expect(sent.API_MUT).toMatchObject({
      customerkey: "customer-key",
      customersecret: "client-secret",
      subscriberMsisdn: "699112233",
      amount: "20000",
      PaiementMethod: "OM_CMR",
    });
    expect(sent.API_MUT.pin).toBeUndefined();
  });

  it("vérifie le statut Paynote en OM_CMR", async () => {
    let statusBody = "";
    const urls: string[] = [];
    const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
      const href = String(url);
      urls.push(href);
      if (href.endsWith("/oauth2/token")) return jsonResponse({ access_token: "tok", expires_in: 300 });
      statusBody = String(init?.body ?? "");
      expect(init?.method).toBe("POST");
      return jsonResponse({ parameters: { status: "PENDING" } });
    }) as typeof fetch;

    const status = await orangePaymentStatus("MPNOTE1", {
      env: {
        ORANGE_MONEY_API_URL: "https://omapi.ynote.africa/prod/webpayment",
        ORANGE_MONEY_USERNAME: "client-id",
        ORANGE_MONEY_PASSWORD: "client-secret",
        ORANGE_MONEY_CUSTOMER_KEY: "customer-key",
        ORANGE_MONEY_CUSTOMER_SECRET: "customer-secret",
      } as unknown as NodeJS.ProcessEnv,
      fetchImpl,
    });

    expect(status).toBe("PENDING");
    expect(urls[1]).toBe("https://omapi.ynote.africa/prod/webpayment/status");
    expect(JSON.parse(statusBody)).toMatchObject({
      customerkey: "customer-key",
      customersecret: "customer-secret",
      message_id: "MPNOTE1",
      payment_method: "OM_CMR",
    });
  });
});

describe("message client solde Orange Money", () => {
  it("dit explicitement que le compte n’a pas assez d’argent", () => {
    const message = orangeCustomerPaymentError();
    expect(message).toMatch(/n’a pas assez d’argent/);
    expect(message).toMatch(/solde/i);
    expect(message).not.toMatch(/n’a pas abouti/);
    expect(ORANGE_BALANCE_NOTICE).toMatch(/avant toute transaction/i);
    expect(ORANGE_BALANCE_NOTICE).toMatch(/solde|assez d’argent/i);
  });

  it("affiche cet avertissement au checkout et sur l’échec du paiement", () => {
    expect(readFileSync("src/app/actions/shop.ts", "utf8")).toContain("orangeCustomerPaymentError()");
    expect(readFileSync("src/components/shop/orange-pay-launch.tsx", "utf8")).toContain("ORANGE_BALANCE_NOTICE");
    expect(readFileSync("src/components/shop/checkout-form.tsx", "utf8")).toContain("ORANGE_BALANCE_NOTICE");
    expect(readFileSync("src/app/actions/shop.ts", "utf8")).not.toContain("La demande automatique n’a pas abouti");
  });
});

describe("la commande attend la fin du push", () => {
  it("passe la promesse à after au lieu de l’abandonner", () => {
    const source = readFileSync("src/services/order.service.ts", "utf8");
    expect(source).toContain("await chargePromise");
    expect(source).not.toContain("void chargePromise");
    expect(source).not.toContain("resolve(false), 15000");
    expect(source).toContain("timeout: 20_000");
    expect(source).toContain("sendOrderOrangePush");
    const page = readFileSync("src/app/(shop)/commande/[number]/page.tsx", "utf8");
    expect(page).toContain("sendOrderOrangePush");
  });
});
