import "dotenv/config";
import { performance } from "node:perf_hooks";
import { prisma } from "../src/lib/prisma";
import { browseShopProducts, parseBrowseQuery } from "../src/lib/shop-browse";

function percentile(samples: number[], fraction: number) {
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}

async function main() {
  if (process.env.PERF_ALLOW_READONLY_DB !== "true") {
    throw new Error("Définissez PERF_ALLOW_READONLY_DB=true après avoir vérifié que DATABASE_URL cible une base de mesure.");
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL manquant.");

  const iterations = Number(process.env.PERF_ITERATIONS ?? 5);
  if (!Number.isSafeInteger(iterations) || iterations < 3 || iterations > 30) {
    throw new Error("PERF_ITERATIONS doit être un entier entre 3 et 30.");
  }
  const terms = (process.env.PERF_SEARCH_TERMS ?? "mèche,meche,perruque")
    .split(",")
    .map((term) => term.trim())
    .filter(Boolean);
  const scenarios = [
    { name: "catalog-page", query: parseBrowseQuery({ page: "1" }) },
    ...terms.map((term, index) => ({
      name: `search-${index + 1}`,
      query: parseBrowseQuery({ q: term, page: "1" }),
    })),
  ];

  try {
    for (const scenario of scenarios) {
      const samples: number[] = [];
      let total = 0;
      for (let iteration = 0; iteration < iterations; iteration++) {
        const start = performance.now();
        const result = await browseShopProducts(scenario.query);
        samples.push(performance.now() - start);
        total = result.total;
      }
      console.log(
        JSON.stringify({
          scenario: scenario.name,
          iterations,
          resultCount: total,
          p50Ms: Number(percentile(samples, 0.5).toFixed(1)),
          p95Ms: Number(percentile(samples, 0.95).toFixed(1)),
          samplesMs: samples.map((sample) => Number(sample.toFixed(1))),
        }),
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Mesure catalogue échouée.");
  process.exitCode = 1;
});
