import { spawnSync } from "node:child_process";

const DELAYS_MS = [0, 4000, 8000, 16000, 32000];

function isPoolSaturated(output: string) {
  return /EMAXCONNSESSION|max clients reached|Can't reach database|P1001|P2024/i.test(output);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function migrateOnce() {
  const env = { ...process.env };
  const direct = process.env.DIRECT_URL?.trim();
  if (direct) env.DATABASE_URL = direct;
  const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    encoding: "utf8",
    env,
    shell: false,
  });
  const text = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  if (text) process.stdout.write(text);
  return { ok: result.status === 0, text };
}

async function main() {
  let last = "";
  for (let i = 0; i < DELAYS_MS.length; i++) {
    const wait = DELAYS_MS[i];
    if (wait) {
      console.warn(`migrate deploy : nouvelle tentative dans ${wait / 1000}s…`);
      await sleep(wait);
    }
    const result = migrateOnce();
    if (result.ok) return;
    last = result.text;
    if (!isPoolSaturated(last)) break;
  }
  if (isPoolSaturated(last)) {
    console.warn(
      "migrate deploy : pool Postgres saturé après plusieurs essais. Aucune migration n’est appliquée dans ce build ; next build continue.",
    );
    return;
  }
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
