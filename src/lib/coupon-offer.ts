/** Offre vitrine NERA10. La commande lit le montant en base, aligné par le seed et la migration. */
export const NERA10_OFFER = {
  code: "NERA10",
  type: "FIXED" as const,
  amount: 1_000,
  minAmount: 20_000,
} as const;
