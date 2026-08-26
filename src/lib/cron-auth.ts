export function cronAuthorized(
  request: Request,
  env: { secret?: string | undefined; nodeEnv?: string | undefined } = {},
) {
  const secret = (env.secret ?? process.env.CRON_SECRET)?.trim();
  const header = request.headers.get("authorization") ?? "";
  if (secret) return header === `Bearer ${secret}`;
  return (env.nodeEnv ?? process.env.NODE_ENV) !== "production";
}

