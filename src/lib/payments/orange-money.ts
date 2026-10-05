import { cameroonMobileLocal } from "@/lib/phone-match";

const TOKEN_SKEW_MS = 30_000;
const CLASSIC_ORIGIN = "https://api-s1.orange.cm";
const PAYNOTE_TOKEN_URL = "https://omapi-token.ynote.africa/oauth2/token";
const PAYNOTE_PAY_URL = "https://omapi.ynote.africa/prod/webpayment";

export type OrangeApiKind = "classic" | "paynote";

export type OrangeConfig = {
  kind: OrangeApiKind;
  origin: string;
  username: string;
  password: string;
  authToken: string;
  channelUserMsisdn: string;
  pin: string;
  customerKey: string;
  customerSecret: string;
};

let cachedToken: { key: string; value: string; expiresAt: number } | null = null;

/** Réduit l’URL configurée à son hôte. Un chemin /token, /omcoreapis ou /webpayment ne doit pas être répété. */
export function orangeApiTarget(raw?: string | null): { origin: string; kind: OrangeApiKind } {
  const trimmed = (raw?.trim() || CLASSIC_ORIGIN).replace(/\/$/, "");
  let url: URL;
  try {
    url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  } catch {
    url = new URL(CLASSIC_ORIGIN);
  }
  const host = url.hostname.toLowerCase();
  const path = url.pathname.toLowerCase();
  const kind: OrangeApiKind =
    host.includes("ynote.africa") || path.includes("webpayment") || path.includes("oauth2") ? "paynote" : "classic";
  return { origin: url.origin, kind };
}

export function orangeConfig(env: NodeJS.ProcessEnv = process.env): OrangeConfig | null {
  const username = env.ORANGE_MONEY_USERNAME?.trim();
  const password = env.ORANGE_MONEY_PASSWORD?.trim();
  if (!username || !password) return null;
  const { origin, kind } = orangeApiTarget(env.ORANGE_MONEY_API_URL);
  const authToken = env.ORANGE_MONEY_AUTH_TOKEN?.trim() ?? "";
  const channelUserMsisdn = orangeSubscriberMsisdn(env.ORANGE_MONEY_CHANNEL_MSISDN ?? "");
  const pin = env.ORANGE_MONEY_PIN?.trim() ?? "";
  const customerKey = env.ORANGE_MONEY_CUSTOMER_KEY?.trim() || authToken;
  const customerSecret = env.ORANGE_MONEY_CUSTOMER_SECRET?.trim() || password;
  if (kind === "paynote") {
    if (!customerKey || !customerSecret) return null;
    return { kind, origin, username, password, authToken, channelUserMsisdn, pin, customerKey, customerSecret };
  }
  if (!authToken || !channelUserMsisdn || !pin) return null;
  return { kind, origin, username, password, authToken, channelUserMsisdn, pin, customerKey, customerSecret };
}

/** Nom du réglage manquant, sans valeur. Null si l’API peut être appelée. */
export function orangeConfigIssue(env: NodeJS.ProcessEnv = process.env) {
  if (orangeConfig(env)) return null;
  if (!env.ORANGE_MONEY_USERNAME?.trim()) return "missing-username";
  if (!env.ORANGE_MONEY_PASSWORD?.trim()) return "missing-password";
  const { kind } = orangeApiTarget(env.ORANGE_MONEY_API_URL);
  if (kind === "paynote") return "missing-customer-key";
  if (!env.ORANGE_MONEY_AUTH_TOKEN?.trim()) return "missing-auth-token";
  if (!orangeSubscriberMsisdn(env.ORANGE_MONEY_CHANNEL_MSISDN ?? "")) return "invalid-channel-msisdn";
  if (!env.ORANGE_MONEY_PIN?.trim()) return "missing-pin";
  return "not-configured";
}

/** Numéro Orange sans indicatif : 9 chiffres, commence par 6. */
export function orangeSubscriberMsisdn(raw: string) {
  return cameroonMobileLocal(raw);
}

/** `#150*47*1059897#` devient un lien qui ouvre le composeur. */
export function orangeUssdHref(code: string) {
  const compact = code.replace(/\s/g, "");
  if (!/^[#*][\d*]+#$/.test(compact)) return null;
  return `tel:${compact.replace(/^#/, "*").replace(/#$/, "%23")}`;
}

export function orangePushWasSent(payment?: { reference?: string | null; note?: string | null } | null) {
  if (!payment) return false;
  if (payment.note?.includes("Demande Orange Money")) return true;
  return Boolean(payment.reference?.startsWith("MP"));
}

export function orangePaymentSucceeded(status?: string | null) {
  const value = (status ?? "").replace(/\s/g, "").toUpperCase();
  return value === "SUCCESSFULL" || value === "SUCCESSFUL" || value === "SUCCESS";
}

export function resetOrangeTokenCache() {
  cachedToken = null;
}

type FetchLike = typeof fetch;

function tokenUrl(config: OrangeConfig) {
  if (config.kind === "classic") return `${config.origin}/token`;
  if (config.origin.includes("omapi-token.ynote.africa")) return `${config.origin}/oauth2/token`;
  return PAYNOTE_TOKEN_URL;
}

function classicUrl(config: OrangeConfig, path: string) {
  return `${config.origin}/omcoreapis/1.0.2${path}`;
}

function paynotePayUrl(config: OrangeConfig) {
  if (config.origin.includes("omapi.ynote.africa") && !config.origin.includes("omapi-token")) {
    return `${config.origin}/prod/webpayment`;
  }
  return PAYNOTE_PAY_URL;
}

function authHeaders(config: OrangeConfig, token: string, json: boolean) {
  return {
    Authorization: `Bearer ${token}`,
    ...(config.kind === "classic" && config.authToken ? { "X-AUTH-TOKEN": config.authToken } : {}),
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}

async function readJson(res: Response) {
  return (await res.json().catch(() => null)) as unknown;
}

function textOf(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function readOrangeReference(body: unknown) {
  if (!body || typeof body !== "object") return "";
  const row = body as Record<string, unknown>;
  const data = row.data && typeof row.data === "object" ? (row.data as Record<string, unknown>) : {};
  const parameters = row.parameters && typeof row.parameters === "object" ? (row.parameters as Record<string, unknown>) : {};
  for (const value of [
    row.payToken,
    row.paytoken,
    row.MessageId,
    row.messageId,
    row.message_id,
    row.paymentRef,
    data.payToken,
    data.paytoken,
    parameters.MessageId,
    parameters.messageId,
    parameters.message_id,
  ]) {
    const text = textOf(value);
    if (text) return text;
  }
  return "";
}

export function readOrangeStatus(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const row = body as {
    data?: { status?: string };
    status?: string;
    payment_status?: string;
    parameters?: { status?: string; Status?: string; payment_status?: string };
  };
  return (
    row.data?.status ??
    row.parameters?.status ??
    row.parameters?.Status ??
    row.parameters?.payment_status ??
    row.payment_status ??
    row.status ??
    null
  );
}

/** Vrai quand Orange confirme que le client doit saisir son code sur le téléphone. */
export function orangeCashInAccepted(body: unknown) {
  if (!body || typeof body !== "object") return false;
  const row = body as {
    message?: string;
    StatusCode?: number | string;
    body?: string;
    ErrorMessage?: string;
    parameters?: { MessageId?: string };
    data?: { inittxnstatus?: string | number; status?: string; inittxnmessage?: string };
  };
  const statusCode = Number(row.StatusCode);
  if (Number.isFinite(statusCode) && statusCode >= 400) return false;
  if (textOf(row.ErrorMessage)) return false;
  const blob = `${row.message ?? ""} ${row.body ?? ""} ${row.data?.inittxnmessage ?? ""}`.toLowerCase();
  if (/push sent to customer/.test(blob)) return true;
  const initStatus = String(row.data?.inittxnstatus ?? "").trim();
  if (initStatus === "200") return true;
  const dataStatus = (row.data?.status ?? "").replace(/\s/g, "").toUpperCase();
  if (
    (dataStatus === "PENDING" || dataStatus === "SUCCESSFULL" || dataStatus === "SUCCESSFUL") &&
    /initiated|pin|paiement|accepted/.test(blob)
  ) {
    return true;
  }
  if (textOf(row.parameters?.MessageId) && (!blob.trim() || /accepted|initiated|success/.test(blob))) return true;
  if (statusCode === 200 && /accepted/.test(blob)) return true;
  return false;
}

function orangeFailureText(step: string, status: number, body: unknown) {
  const detail = publicOrangeDetail(body);
  return detail ? `Orange Money ${step} ${status} ${detail}` : `Orange Money ${step} ${status}`;
}

function publicOrangeDetail(body: unknown) {
  if (!body || typeof body !== "object") return "";
  const row = body as {
    message?: unknown;
    ErrorMessage?: unknown;
    body?: unknown;
    error_description?: unknown;
    data?: { inittxnstatus?: unknown; inittxnmessage?: unknown };
  };
  const parts: string[] = [];
  const initStatus = textOf(row.data?.inittxnstatus != null ? String(row.data.inittxnstatus) : "");
  if (initStatus) parts.push(`inittxnstatus=${initStatus}`);
  for (const value of [row.message, row.ErrorMessage, row.body, row.error_description, row.data?.inittxnmessage]) {
    const text = textOf(value);
    if (text) parts.push(text);
  }
  return parts.join(" ").replace(/\s+/g, " ").slice(0, 160);
}

async function accessToken(config: OrangeConfig, doFetch: FetchLike) {
  const key = `${config.kind}:${tokenUrl(config)}:${config.username}`;
  if (cachedToken && cachedToken.key === key && cachedToken.expiresAt > Date.now()) return cachedToken.value;
  const basic = Buffer.from(`${config.username}:${config.password}`).toString("base64");
  const res = await doFetch(tokenUrl(config), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(12000),
  });
  const body = await readJson(res);
  if (!res.ok) throw new Error(orangeFailureText("token", res.status, body));
  const access = body && typeof body === "object" ? textOf((body as { access_token?: string }).access_token) : "";
  if (!access) throw new Error("Orange Money n’a pas renvoyé de jeton.");
  const expiresIn = body && typeof body === "object" ? Number((body as { expires_in?: number }).expires_in) : 3600;
  const ttl = Math.max(30, expiresIn || 3600) * 1000;
  cachedToken = { key, value: access, expiresAt: Date.now() + ttl - TOKEN_SKEW_MS };
  return access;
}

export async function requestOrangeCashIn(
  input: {
    amount: number;
    phone: string;
    orderId: string;
    description: string;
    notifUrl: string;
  },
  options?: { fetchImpl?: FetchLike; env?: NodeJS.ProcessEnv },
) {
  const config = orangeConfig(options?.env);
  if (!config) return { ok: false as const, reason: orangeConfigIssue(options?.env) ?? "not-configured" };
  const subscriber = orangeSubscriberMsisdn(input.phone);
  if (!subscriber) return { ok: false as const, reason: "invalid-phone" };
  const amount = Math.round(input.amount);
  if (amount < 10) return { ok: false as const, reason: "amount" };
  const doFetch = options?.fetchImpl ?? fetch;
  const token = await accessToken(config, doFetch);
  if (config.kind === "paynote") return paynoteCashIn(config, token, doFetch, input, subscriber, amount);
  return classicCashIn(config, token, doFetch, input, subscriber, amount);
}

async function classicCashIn(
  config: OrangeConfig,
  token: string,
  doFetch: FetchLike,
  input: { orderId: string; description: string; notifUrl: string },
  subscriber: string,
  amount: number,
) {
  const init = await doFetch(classicUrl(config, "/mp/init"), {
    method: "POST",
    headers: authHeaders(config, token, false),
    signal: AbortSignal.timeout(15000),
  });
  const initBody = await readJson(init);
  if (!init.ok) throw new Error(orangeFailureText("init", init.status, initBody));
  const payToken = readOrangeReference(initBody);
  if (!payToken) throw new Error("Orange Money n’a pas renvoyé de payToken.");
  const pay = await doFetch(classicUrl(config, "/mp/pay"), {
    method: "POST",
    headers: authHeaders(config, token, true),
    body: JSON.stringify({
      notifUrl: input.notifUrl,
      channelUserMsisdn: config.channelUserMsisdn,
      amount: String(amount),
      subscriberMsisdn: subscriber,
      pin: config.pin,
      orderId: input.orderId,
      description: input.description.slice(0, 80),
      payToken,
    }),
    signal: AbortSignal.timeout(20000),
  });
  const payBody = await readJson(pay);
  if (!pay.ok) throw new Error(orangeFailureText("pay", pay.status, payBody));
  if (orangeCashInAccepted(payBody)) return { ok: true as const, payToken: readOrangeReference(payBody) || payToken };
  const push = await doFetch(classicUrl(config, `/mp/push/${encodeURIComponent(payToken)}`), {
    method: "GET",
    headers: authHeaders(config, token, false),
    signal: AbortSignal.timeout(15000),
  });
  const pushBody = await readJson(push);
  if (!push.ok || !orangeCashInAccepted(pushBody)) {
    throw new Error(orangeFailureText(push.ok ? "pay" : "push", push.ok ? pay.status : push.status, push.ok ? payBody : pushBody));
  }
  return { ok: true as const, payToken: readOrangeReference(pushBody) || payToken };
}

async function paynoteCashIn(
  config: OrangeConfig,
  token: string,
  doFetch: FetchLike,
  input: { orderId: string; description: string; notifUrl: string },
  subscriber: string,
  amount: number,
) {
  const pay = await doFetch(paynotePayUrl(config), {
    method: "POST",
    headers: authHeaders(config, token, true),
    body: JSON.stringify({
      API_MUT: {
        customerkey: config.customerKey,
        customersecret: config.customerSecret,
        order_id: input.orderId,
        amount: String(amount),
        subscriberMsisdn: subscriber,
        description: input.description.slice(0, 80),
        notifUrl: input.notifUrl,
        PaiementMethod: "OM_CMR",
      },
    }),
    signal: AbortSignal.timeout(20000),
  });
  const body = await readJson(pay);
  if (!pay.ok || !orangeCashInAccepted(body)) throw new Error(orangeFailureText("pay", pay.status, body));
  const payToken = readOrangeReference(body);
  if (!payToken) throw new Error("Orange Money n’a pas renvoyé de référence.");
  return { ok: true as const, payToken };
}

export async function orangePaymentStatus(payToken: string, options?: { fetchImpl?: FetchLike; env?: NodeJS.ProcessEnv }) {
  const config = orangeConfig(options?.env);
  if (!config) return null;
  const doFetch = options?.fetchImpl ?? fetch;
  const token = await accessToken(config, doFetch);
  const res =
    config.kind === "paynote"
      ? await doFetch(`${paynotePayUrl(config)}/status`, {
          method: "POST",
          headers: authHeaders(config, token, true),
          body: JSON.stringify({
            customerkey: config.customerKey,
            customersecret: config.customerSecret,
            message_id: payToken,
            payment_method: "OM_CMR",
          }),
          signal: AbortSignal.timeout(12000),
        })
      : await doFetch(classicUrl(config, `/mp/paymentstatus/${encodeURIComponent(payToken)}`), {
          headers: authHeaders(config, token, false),
          signal: AbortSignal.timeout(12000),
        });
  if (!res.ok) return null;
  return readOrangeStatus(await readJson(res));
}
