import { timingSafeEqual } from "node:crypto";

function bearerMatches(header: string, secret: string) {
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function cronAuthorized(
  request: Request,
  env: { secret?: string | undefined; nodeEnv?: string | undefined } = {},
) {
  const secret = (env.secret ?? process.env.CRON_SECRET)?.trim();
  const header = request.headers.get("authorization") ?? "";
  if (secret) return bearerMatches(header, secret);
  return (env.nodeEnv ?? process.env.NODE_ENV) !== "production";
}

