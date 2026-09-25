import type { PartnershipType } from "@prisma/client";

export type SettlementLineInput = {
  quantity: number;
  revenue: number;
  cost: number;
};

export function splitPartnerAmounts(input: {
  partnershipType: PartnershipType;
  commissionBps: number;
  lines: SettlementLineInput[];
}) {
  const gross = input.lines.reduce((sum, line) => sum + line.revenue, 0);
  const cost = input.lines.reduce((sum, line) => sum + line.cost, 0);
  const bps = Math.max(0, Math.min(10000, input.commissionBps));
  let brandShare = 0;
  if (
    input.partnershipType === "COMMISSION" ||
    input.partnershipType === "CATALOG" ||
    input.partnershipType === "ON_DEMAND"
  ) {
    brandShare = Math.round((gross * bps) / 10000);
  } else if (input.partnershipType === "CONSIGNMENT") {
    brandShare = Math.min(gross, cost);
  }
  const neraShare =
    input.partnershipType === "WHOLESALE" ? gross - cost : gross - brandShare;
  return { gross, cost, brandShare, neraShare };
}

export function settlementRuleLabel(type: PartnershipType) {
  if (type === "COMMISSION" || type === "CATALOG" || type === "ON_DEMAND") {
    return "La part marque est un pourcentage du chiffre encaissé.";
  }
  if (type === "CONSIGNMENT") {
    return "La part marque est le prix de dépôt des pièces vendues. NERA garde la marge.";
  }
  if (type === "WHOLESALE") {
    return "Le stock a été acheté. La part marque à reverser sur les ventes est nulle. Le relevé montre la marge NERA.";
  }
  return "Choisissez un type de partenariat pour calculer le reversement.";
}
