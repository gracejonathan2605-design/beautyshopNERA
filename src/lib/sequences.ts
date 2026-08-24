import { Prisma } from "@prisma/client";

export async function nextSequence(
  tx: Prisma.TransactionClient,
  name: string,
) {
  const year = new Date().getFullYear();
  const rows = await tx.$queryRaw<{ value: number }[]>`
    INSERT INTO "Sequence" (name, year, value)
    VALUES (${name}, ${year}, 1)
    ON CONFLICT (name, year)
    DO UPDATE SET value = "Sequence".value + 1
    RETURNING value
  `;
  return { year, value: rows[0].value };
}

export function formatRef(prefix: string, year: number, value: number, pad = 6) {
  return `${prefix}-${year}-${String(value).padStart(pad, "0")}`;
}
