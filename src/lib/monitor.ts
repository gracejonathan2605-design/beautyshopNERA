export function reportError(scope: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[${scope}]`, message);
  const url = process.env.ERROR_WEBHOOK_URL?.trim();
  if (!url) return;
  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scope, message, at: new Date().toISOString() }),
    signal: AbortSignal.timeout(4000),
  }).catch(() => undefined);
}
