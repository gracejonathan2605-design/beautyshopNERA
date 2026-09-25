const TOKEN_SKEW_MS = 30_000;

export type OrangeConfig = {
  base: string;
  username: string;
  password: string;
  authToken: string;
  channelUserMsisdn: string;
  pin: string;
};

let cachedToken: { value: string; expiresAt: number } | null = null;

export function orangeConfig(env: NodeJS.ProcessEnv = process.env): OrangeConfig | null {
  const username = env.ORANGE_MONEY_USERNAME?.trim();
  const password = env.ORANGE_MONEY_PASSWORD?.trim();
  const authToken = env.ORANGE_MONEY_AUTH_TOKEN?.trim();
  const channelUserMsisdn = orangeSubscriberMsisdn(env.ORANGE_MONEY_CHANNEL_MSISDN ?? "");
  const pin = env.ORANGE_MONEY_PIN?.trim();
  if (!username || !password || !authToken || !channelUserMsisdn || !pin) return null;
  const base = (env.ORANGE_MONEY_API_URL?.trim() || "https://api-s1.orange.cm").replace(/\/$/, "");
  return { base, username, password, authToken, channelUserMsisdn, pin };
}

/** Numéro Orange sans indicatif : 9 chiffres, commence par 6. */
export function orangeSubscriberMsisdn(raw: string) {
  const digits = raw.replace(/\D/g, "");
  const local = digits.startsWith("237") ? digits.slice(3) : digits.startsWith("0") ? digits.slice(1) : digits;
  if (local.length === 9 && local.startsWith("6")) return local;
  return "";
}

export function orangePaymentSucceeded(status?: string | null) {
  const value = (status ?? "").replace(/\s/g, "").toUpperCase();
  return value === "SUCCESSFULL" || value === "SUCCESSFUL" || value === "SUCCESS";
}

export function resetOrangeTokenCache() {
  cachedToken = null;
}

async function accessToken(config: OrangeConfig) {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;
  const basic = Buffer.from(`${config.username}:${config.password}`).toString("base64");
  const res = await fetch(`${config.base}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`Orange Money token ${res.status}`);
  const body = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!body.access_token) throw new Error("Orange Money n’a pas renvoyé de jeton.");
  const ttl = Math.max(30, Number(body.expires_in) || 3600) * 1000;
  cachedToken = { value: body.access_token, expiresAt: Date.now() + ttl - TOKEN_SKEW_MS };
  return body.access_token;
}

function headers(config: OrangeConfig, token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "X-AUTH-TOKEN": config.authToken,
    "Content-Type": "application/json",
  };
}

export async function requestOrangeCashIn(input: {
  amount: number;
  phone: string;
  orderId: string;
  description: string;
  notifUrl: string;
}) {
  const config = orangeConfig();
  if (!config) return { ok: false as const, reason: "not-configured" };
  const subscriber = orangeSubscriberMsisdn(input.phone);
  if (!subscriber) return { ok: false as const, reason: "invalid-phone" };
  const amount = Math.round(input.amount);
  if (amount < 10) return { ok: false as const, reason: "amount" };
  const token = await accessToken(config);
  const init = await fetch(`${config.base}/omcoreapis/1.0.2/mp/init`, {
    method: "POST",
    headers: headers(config, token),
    signal: AbortSignal.timeout(15000),
  });
  if (!init.ok) throw new Error(`Orange Money init ${init.status}`);
  const initBody = (await init.json()) as { data?: { payToken?: string } };
  const payToken = initBody.data?.payToken?.trim();
  if (!payToken) throw new Error("Orange Money n’a pas renvoyé de payToken.");
  const pay = await fetch(`${config.base}/omcoreapis/1.0.2/mp/pay`, {
    method: "POST",
    headers: headers(config, token),
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
  if (!pay.ok) throw new Error(`Orange Money pay ${pay.status}`);
  return { ok: true as const, payToken };
}

export async function orangePaymentStatus(payToken: string) {
  const config = orangeConfig();
  if (!config) return null;
  const token = await accessToken(config);
  const res = await fetch(`${config.base}/omcoreapis/1.0.2/mp/paymentstatus/${encodeURIComponent(payToken)}`, {
    headers: headers(config, token),
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { data?: { status?: string; orderId?: string }; status?: string };
  return body.data?.status ?? body.status ?? null;
}
